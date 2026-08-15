import { randomUUID } from "node:crypto";

import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createDocsServer } from "@/lib/docs-mcp";

/**
 * MCP over HTTP (streamable HTTP) for the Ryu docs site.
 *
 * This is the "docs MCP" endpoint — the same pattern OpenAI hosts at
 * `/mcp` on its developer docs: a read-only server exposing this
 * documentation as tools (`docs_search`, `docs_get_page`, `docs_index`), so an
 * agent can pull the right page into context while it works.
 *
 * The server itself lives in `src/lib/docs-mcp.ts`; this file is a thin
 * Next.js App Router shell that wires the SDK's web-standard streamable-HTTP
 * transport to the runtime. The Ryu built-in `@ryu/docs` plugin registers this
 * URL (`https://docs.ryuhq.com/mcp`) as a remote MCP server, and external
 * hosts (Cursor, Claude Code, Codex, …) can add it directly.
 *
 * Sessions are per-client HTTP sessions. Each session gets its OWN
 * `McpServer` + transport instance: the SDK's `Protocol` routes responses
 * through a single transport field, so sharing one server across concurrent
 * sessions would cross-wire them. A docs server is stateless (tools only read
 * the docs tree), so this costs nothing but a few tool registrations per
 * session.
 *
 * Sessions are bounded: when the map fills up, the least-recently-used session
 * is closed, so an abandoned client cannot pin server memory forever.
 */

interface Session {
  server: ReturnType<typeof createDocsServer>;
  transport: WebStandardStreamableHTTPServerTransport;
  lastActive: number;
}

const sessions = new Map<string, Session>();

/** Cap on concurrent sessions before the least-recently-used one is evicted. */
const MAX_SESSIONS = 64;

export const dynamic = "force-dynamic";

const SESSION_HEADER = "mcp-session-id";

function sessionError(message: string, status: number): NextResponse {
  return NextResponse.json(
    { jsonrpc: "2.0", id: null, error: { code: -32000, message } },
    { status },
  );
}

function touch(session: Session) {
  session.lastActive = Date.now();
}

function evictIfNeeded(newId: string) {
  if (sessions.size < MAX_SESSIONS) {
    return;
  }
  const oldest = [...sessions.entries()]
    .filter(([id]) => id !== newId)
    .sort((a, b) => a[1].lastActive - b[1].lastActive)[0];
  if (oldest) {
    sessions.delete(oldest[0]);
    // Best-effort: closing the transport releases the SDK's streams. The
    // server object is unreferenced afterwards and gets garbage-collected.
    void oldest[1].server.close().catch(() => {});
  }
}

function openSession(): Session {
  const server = createDocsServer();
  let transport: WebStandardStreamableHTTPServerTransport | undefined;
  transport = new WebStandardStreamableHTTPServerTransport({
    // Enable JSON responses for POST when the client prefers them (simple
    // agents that just POST) while still honouring an `Accept:
    // text/event-stream` client with an SSE stream.
    enableJsonResponse: true,
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (id) => {
      if (!transport) {
        return;
      }
      sessions.set(id, { server, transport, lastActive: Date.now() });
      evictIfNeeded(id);
    },
    onsessionclosed: (id) => {
      sessions.delete(id);
    },
  });
  void server.connect(transport);
  return { server, transport, lastActive: Date.now() };
}

export async function POST(req: NextRequest) {
  const sessionId = req.headers.get(SESSION_HEADER);
  let session = sessionId ? sessions.get(sessionId) : undefined;

  if (!session) {
    // New session (or a stale id the map already dropped — treat as fresh).
    session = openSession();
    // The transport generates the session id on initialize and registers it
    // via `onsessioninitialized` during handleRequest below.
  } else {
    touch(session);
  }

  return session.transport.handleRequest(req);
}

export async function GET(req: NextRequest) {
  const sessionId = req.headers.get(SESSION_HEADER);
  const session = sessionId ? sessions.get(sessionId) : undefined;
  if (!session) {
    // The SSE stream for a missing session is an error, per the MCP spec.
    return sessionError("Missing or unknown MCP session.", 400);
  }
  touch(session);
  return session.transport.handleRequest(req);
}

export async function DELETE(req: NextRequest) {
  const sessionId = req.headers.get(SESSION_HEADER);
  const session = sessionId ? sessions.get(sessionId) : undefined;
  if (!session) {
    return new Response(null, { status: 404 });
  }
  // The transport closes the session and fires `onsessionclosed`, which drops
  // it from the map.
  return session.transport.handleRequest(req);
}
