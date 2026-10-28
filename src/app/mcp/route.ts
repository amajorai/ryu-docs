import { createMcpHandler } from "@modelcontextprotocol/server";
import { rejectBrotliEncodedRequestIfNeeded } from "@ryu/portable-packages/bun-brotli-mitigation";

import { createDocsServer } from "@/lib/docs-mcp";

/**
 * Stateless MCP over HTTP for the Ryu docs site. The SDK serves the
 * 2026-07-28 protocol and keeps 2025 clients working through its stateless
 * compatibility path. The docs tools only read the generated docs tree, so
 * each exchange builds its own server and retains no protocol session.
 */
const handler = createMcpHandler(() => createDocsServer(), {
  legacy: "stateless",
});

export const dynamic = "force-dynamic";

function handleMcp(request: Request): Promise<Response> {
  const rejected = rejectBrotliEncodedRequestIfNeeded(request);
  if (rejected) {
    return Promise.resolve(rejected);
  }
  return handler.fetch(request);
}

export function POST(request: Request): Promise<Response> {
  return handleMcp(request);
}

export function GET(request: Request): Promise<Response> {
  return handleMcp(request);
}

export function DELETE(request: Request): Promise<Response> {
  return handleMcp(request);
}
