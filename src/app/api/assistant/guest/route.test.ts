import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
} from "bun:test";
import { resetGuestChatLimits } from "@ryu/assistant-widget/guest-route";
import { z } from "zod";

import { GET, POST, runtime } from "./route";

// The guest assistant forwards to the hosted Ryu Gateway. These tests never
// reach one: a local HTTP fixture plays the Gateway, and outbound fetches to the
// configured Gateway URL are re-addressed to that fixture (any other outbound
// URL, including any third-party free tier, fails the test).
const GATEWAY_URL = "https://gateway.docs.test";
const GATEWAY_COMPLETIONS = `${GATEWAY_URL}/v1/chat/completions`;
const SITE = "https://docs.test";
const VISITOR_SECRET = "visitor-session-7f3a";
const GUEST_ENV = {
  NODE_ENV: "production",
  RYU_GUEST_CHAT_CLIENT_IP_HEADER: "cf-connecting-ip",
  RYU_GUEST_CHAT_GATEWAY_KEY: "rgw_docs_guest_test",
  RYU_GUEST_CHAT_GATEWAY_URL: GATEWAY_URL,
} as const;

type GatewayReply = () => Response;
type GatewayCall = { body: string; headers: Headers };

const errorBody = z.object({ error: z.object({ message: z.string() }) });
const gatewayRequest = z.strictObject({
  max_tokens: z.literal(1200),
  messages: z.array(z.object({ content: z.string(), role: z.string() })),
  model: z.string(),
  stream: z.literal(true),
});

const calls: GatewayCall[] = [];
let reply: GatewayReply = () => new Response("data: [DONE]\n\n");
let gateway: ReturnType<typeof Bun.serve>;
const realFetch = globalThis.fetch;
const savedEnv = new Map<string, string | undefined>();
let nextIp = 1;

beforeAll(() => {
  resetGuestChatLimits();
  for (const [name, value] of Object.entries(GUEST_ENV)) {
    savedEnv.set(name, process.env[name]);
    process.env[name] = value;
  }
  gateway = Bun.serve({
    async fetch(request) {
      calls.push({ body: await request.text(), headers: request.headers });
      return reply();
    },
    hostname: "127.0.0.1",
    port: 0,
  });
  const routed = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url !== GATEWAY_COMPLETIONS) {
      throw new Error(`Unexpected outbound request to ${url}`);
    }
    return realFetch(
      `http://127.0.0.1:${gateway.port}/v1/chat/completions`,
      init,
    );
  };
  globalThis.fetch = Object.assign(routed, {
    preconnect: realFetch.preconnect,
  });
});

afterEach(() => {
  calls.length = 0;
  reply = () => new Response("data: [DONE]\n\n");
  resetGuestChatLimits();
});

afterAll(() => {
  globalThis.fetch = realFetch;
  gateway.stop(true);
  for (const [name, value] of savedEnv) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
});

/** A same-origin visitor POST; each call gets its own client address. */
function visitorPost(
  body: string,
  headers: Record<string, string> = {},
): Request {
  nextIp += 1;
  return new Request(`${SITE}/api/assistant/guest`, {
    body,
    headers: {
      "cf-connecting-ip": `203.0.113.${nextIp}`,
      "Content-Type": "application/json",
      Origin: SITE,
      ...headers,
    },
    method: "POST",
  });
}

const question = (text = "What is Ryu?") => JSON.stringify({ question: text });

async function errorOf(response: Response) {
  return {
    message: errorBody.parse(await response.json()).error.message,
    status: response.status,
  };
}

describe("docs assistant route (screened guest chat)", () => {
  test("runs on Node.js and reports the guest lane as available", async () => {
    const response = GET();

    expect(runtime).toBe("nodejs");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ available: true });
  });

  test("streams the Gateway's answer back to the visitor", async () => {
    const chunk = JSON.stringify({ choices: [{ delta: { content: "Ryu" } }] });
    reply = () =>
      new Response(`data: ${chunk}\n\ndata: [DONE]\n\n`, {
        headers: { "Content-Type": "text/event-stream" },
      });

    const response = await POST(visitorPost(question("What is Ryu?")));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/event-stream; charset=utf-8",
    );
    expect(response.headers.get("cache-control")).toBe(
      "no-store, no-transform",
    );
    expect(await response.text()).toBe(`data: ${chunk}\n\ndata: [DONE]\n\n`);
    expect(calls).toHaveLength(1);
    const sent = gatewayRequest.parse(JSON.parse(calls[0]?.body ?? ""));
    expect(sent.model).toBe("openrouter/free");
    expect(sent.messages.at(-1)).toEqual({
      content: "What is Ryu?",
      role: "user",
    });
    const headers = calls[0]?.headers;
    expect(headers?.get("authorization")).toBe("Bearer rgw_docs_guest_test");
    expect(headers?.get("x-ryu-end-user")).toMatch(/^gc1\.[0-9a-f]{32}$/u);
    expect(headers?.get("user-agent") ?? "").not.toMatch(/opencode/iu);
    expect(headers?.get("x-opencode-client")).toBeNull();
  });

  test("never forwards the visitor's credentials or returns the Gateway's", async () => {
    reply = () =>
      new Response("data: [DONE]\n\n", {
        headers: {
          "Content-Type": "text/event-stream",
          "Set-Cookie": "gateway_session=upstream-secret",
          "X-Provider-Trace": "internal-route-42",
        },
      });

    const response = await POST(
      visitorPost(question(), {
        Authorization: `Bearer ${VISITOR_SECRET}`,
        Cookie: `better-auth.session_token=${VISITOR_SECRET}`,
        "X-Api-Key": VISITOR_SECRET,
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("x-provider-trace")).toBeNull();
    const [call] = calls;
    expect(call?.headers.get("authorization")).toBe(
      "Bearer rgw_docs_guest_test",
    );
    expect(call?.headers.get("cookie")).toBeNull();
    expect(call?.headers.get("x-api-key")).toBeNull();
    const forwarded = JSON.stringify([...(call?.headers ?? [])]) + call?.body;
    expect(forwarded).not.toContain(VISITOR_SECRET);
  });

  test("refuses malformed or foreign requests before contacting the Gateway", async () => {
    const refused = [
      await errorOf(
        await POST(visitorPost(question(), { Origin: "https://evil.test" })),
      ),
      await errorOf(
        await POST(visitorPost(question(), { "Sec-Fetch-Site": "cross-site" })),
      ),
      await errorOf(
        await POST(visitorPost(question(), { "Content-Type": "text/plain" })),
      ),
      await errorOf(await POST(visitorPost("{not json"))),
      await errorOf(await POST(visitorPost(question("   ")))),
      await errorOf(await POST(visitorPost(question("x".repeat(17 * 1024))))),
      await errorOf(
        await POST(visitorPost(question(), { "cf-connecting-ip": "spoofed" })),
      ),
    ];

    expect(refused.map(({ status }) => status)).toEqual([
      403, 403, 415, 400, 400, 413, 503,
    ]);
    expect(refused[3]?.message).toBe("Request body must be valid JSON.");
    expect(refused[5]?.message).toBe("Request body is too large.");
    expect(calls).toHaveLength(0);
  });

  test("answers 503 with a fixed message when the Gateway cannot be reached", async () => {
    const closed = Bun.serve({ fetch: () => new Response(), port: 0 });
    const closedPort = closed.port;
    closed.stop(true);
    const reachable = gateway;
    gateway = { ...reachable, port: closedPort } as typeof gateway;

    let refused: { message: string; status: number };
    try {
      refused = await errorOf(await POST(visitorPost(question())));
    } finally {
      gateway = reachable;
    }

    expect(refused).toEqual({
      message:
        "Guest chat is temporarily unavailable. Try the Browser runtime, or try again later.",
      status: 503,
    });
  });

  test("relays a Gateway rate limit with its Retry-After but not its text", async () => {
    reply = () =>
      Response.json(
        { error: { message: "Org budget exhausted for rgw_docs" } },
        { headers: { "Retry-After": "120" }, status: 429 },
      );

    const response = await POST(visitorPost(question()));

    expect(response.headers.get("retry-after")).toBe("120");
    expect(await errorOf(response)).toEqual({
      message: "Guest chat is busy right now. Try again in a few minutes.",
      status: 429,
    });
  });

  test("hides a Gateway failure page and its error message", async () => {
    reply = () =>
      new Response("<html>Traceback: GATEWAY_INTERNAL_KEY=sk-live-1</html>", {
        headers: { "Content-Type": "text/html" },
        status: 500,
      });
    const failurePage = await errorOf(await POST(visitorPost(question())));

    reply = () =>
      Response.json({ error: { message: "e".repeat(2000) } }, { status: 503 });
    const longError = await errorOf(await POST(visitorPost(question())));

    const unavailable = {
      message:
        "Guest chat is temporarily unavailable. Try the Browser runtime, or try again later.",
      status: 503,
    };
    expect(failurePage).toEqual(unavailable);
    expect(longError).toEqual(unavailable);
  });
});
