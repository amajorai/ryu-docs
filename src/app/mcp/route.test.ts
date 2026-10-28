import { describe, expect, test } from "bun:test";
import { NextRequest } from "next/server";
import { z } from "zod";

import { DELETE, GET, POST } from "./route";

const protocolVersion = "2026-07-28";
const url = "http://docs.test/mcp";

const fixtureParamsSchema = z.record(z.string(), z.json());
type McpFixtureParams = z.input<typeof fixtureParamsSchema>;
const rpcEnvelopeSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number(), z.null()]),
  result: z.json().optional(),
  error: z
    .object({
      code: z.number(),
      message: z.string(),
      data: z.json().optional(),
    })
    .optional(),
});
const discoverResultSchema = z.object({
  supportedVersions: z.array(z.string()).optional(),
});
const toolsResultSchema = z.object({
  tools: z.array(z.object({ name: z.string() })).optional(),
});

function modernRequest(
  method: string,
  params: McpFixtureParams = {},
  id = "mcp-test-1",
): NextRequest {
  const headers = new Headers({
    accept: "application/json, text/event-stream",
    "content-type": "application/json",
    "mcp-method": method,
    "mcp-protocol-version": protocolVersion,
  });
  const name = [params.name, params.uri, params.taskId]
    .map((value) => z.string().safeParse(value))
    .find((result) => result.success);
  if (name?.success) {
    headers.set("mcp-name", name.data);
  }
  return new NextRequest(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      id,
      jsonrpc: "2.0",
      method,
      params: {
        ...params,
        _meta: {
          "io.modelcontextprotocol/clientCapabilities": {},
          "io.modelcontextprotocol/clientInfo": {
            name: "route-test",
            version: "1.0.0",
          },
          "io.modelcontextprotocol/protocolVersion": protocolVersion,
        },
      },
    }),
  });
}

async function jsonRpcResponse(
  response: Response,
): Promise<z.output<typeof rpcEnvelopeSchema>> {
  const body = await response.text();
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const candidates = contentType.includes("text/event-stream")
    ? body
        .split(/\r?\n\r?\n/)
        .map((event) =>
          event
            .split(/\r?\n/)
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trimStart())
            .join("\n"),
        )
        .filter(Boolean)
    : [body];
  for (const candidate of candidates) {
    const parsed = rpcEnvelopeSchema.safeParse(JSON.parse(candidate));
    if (parsed.success) {
      return parsed.data;
    }
  }
  throw new Error("MCP response contained no JSON-RPC envelope");
}

describe("docs MCP route", () => {
  test("discovers the 2026 protocol without creating an HTTP session", async () => {
    const response = await POST(modernRequest("server/discover"));
    const envelope = await jsonRpcResponse(response);
    const result = discoverResultSchema.parse(envelope.result);

    expect(response.status).toBe(200);
    expect(result.supportedVersions).toContain(protocolVersion);
    expect(response.headers.get("mcp-session-id")).toBeNull();
  });

  test("acknowledges 2026 subscriptions on a stateless POST SSE stream", async () => {
    const response = await POST(
      modernRequest("subscriptions/listen", {
        notifications: { toolsListChanged: true },
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(response.headers.get("mcp-session-id")).toBeNull();

    const reader = response.body?.getReader();
    expect(reader).toBeDefined();
    if (!reader) {
      return;
    }
    const { done, value } = await reader.read();
    expect(done).toBe(false);
    const acknowledgement = new TextDecoder().decode(value);
    expect(acknowledgement).toContain(
      "notifications/subscriptions/acknowledged",
    );
    expect(acknowledgement).toContain(
      '"io.modelcontextprotocol/subscriptionId":"mcp-test-1"',
    );
    await reader.cancel();
  });

  test("serves current clients' docs tools on stateless request envelopes", async () => {
    const list = await POST(modernRequest("tools/list"));
    const tools = await jsonRpcResponse(list);
    const listedTools = toolsResultSchema.parse(tools.result);
    expect(listedTools.tools?.map((tool) => tool.name)).toEqual([
      "docs_search",
      "docs_get_page",
      "docs_index",
    ]);
    expect(list.headers.get("mcp-session-id")).toBeNull();

    const call = await POST(
      modernRequest(
        "tools/call",
        { name: "docs_index", arguments: {} },
        "call-1",
      ),
    );
    const result = await jsonRpcResponse(call);
    expect(result.error).toBeUndefined();
    expect(JSON.stringify(result.result)).toContain(
      "All Ryu documentation pages",
    );
    expect(call.headers.get("mcp-session-id")).toBeNull();
  });

  test("keeps legacy requests stateless and no longer serves a session stream", async () => {
    const initialize = await POST(
      new NextRequest(url, {
        method: "POST",
        headers: {
          accept: "application/json, text/event-stream",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          id: 1,
          jsonrpc: "2.0",
          method: "initialize",
          params: {
            capabilities: {},
            clientInfo: { name: "legacy-test", version: "1.0.0" },
            protocolVersion: "2025-06-18",
          },
        }),
      }),
    );
    expect(initialize.status).toBe(200);
    expect(initialize.headers.get("mcp-session-id")).toBeNull();

    const legacyList = await POST(
      new NextRequest(url, {
        method: "POST",
        headers: {
          accept: "application/json, text/event-stream",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          id: 2,
          jsonrpc: "2.0",
          method: "tools/list",
          params: {},
        }),
      }),
    );
    expect(legacyList.status).toBe(200);
    expect(legacyList.headers.get("mcp-session-id")).toBeNull();
    const tools = await jsonRpcResponse(legacyList);
    expect(toolsResultSchema.parse(tools.result).tools).toHaveLength(3);

    const get = await GET(new NextRequest(url, { method: "GET" }));
    const remove = await DELETE(new NextRequest(url, { method: "DELETE" }));
    expect(get.status).toBe(405);
    expect(remove.status).toBe(405);
  });
});
