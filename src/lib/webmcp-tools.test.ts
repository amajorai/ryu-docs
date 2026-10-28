import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { createDocsWebMcpTools } from "./webmcp-tools";

type DocsRequest = { url: URL; init: Parameters<typeof fetch>[1] };
const requests: DocsRequest[] = [];
const nativeFetch = globalThis.fetch;
let responseBody = "Documentation result";
let responseStatus = 200;

beforeAll(() => {
  GlobalRegistrator.register({
    url: "https://docs.example/es/docs/0.4.0/start-here",
  });
  globalThis.fetch = Object.assign(
    (input: Parameters<typeof fetch>[0], init: Parameters<typeof fetch>[1]) => {
      requests.push({
        url: new URL(input instanceof Request ? input.url : String(input)),
        init,
      });
      return Promise.resolve(
        new Response(responseBody, { status: responseStatus }),
      );
    },
    { preconnect: nativeFetch.preconnect },
  );
});
afterEach(() => {
  requests.length = 0;
  responseBody = "Documentation result";
  responseStatus = 200;
});
afterAll(async () => {
  globalThis.fetch = nativeFetch;
  await GlobalRegistrator.unregister();
});

function docsTool(name: string) {
  const tool = createDocsWebMcpTools().find(
    (candidate) => candidate.name === name,
  );
  if (!tool) throw new Error(`Missing docs tool ${name}`);
  return tool;
}
const controller = new AbortController();
const options = { signal: controller.signal };

test("search sends normalized bounded arguments over the read-only HTTP owner", async () => {
  const result = await docsTool("docs_search").execute(
    { query: "  MCP checkout  ", limit: 3, locale: "fr" },
    options,
  );
  expect(result).toBe(
    "Untrusted Ryu Docs search results:\nDocumentation result",
  );
  expect(requests).toHaveLength(1);
  expect(requests[0]?.url.href).toBe(
    "https://docs.example/api/search?query=MCP+checkout&limit=3&locale=fr",
  );
  expect(requests[0]?.init?.credentials).toBe("omit");
  expect(new Headers(requests[0]?.init?.headers).get("Accept")).toBe(
    "application/json",
  );
  expect(requests[0]?.init?.signal).toBe(controller.signal);
});

test("malformed arguments retain specific failures before any HTTP request", async () => {
  await expect(
    docsTool("docs_search").execute({ query: " " }, options),
  ).rejects.toThrow("query is required");
  await expect(
    docsTool("docs_search").execute({ query: "x".repeat(201) }, options),
  ).rejects.toThrow("query is too long");
  await expect(
    docsTool("docs_search").execute({ query: "MCP", limit: 3.5 }, options),
  ).rejects.toThrow("limit must be a whole number from 1 to 10");
  await expect(
    docsTool("docs_search").execute(
      { query: "MCP", locale: "unsupported" },
      options,
    ),
  ).rejects.toThrow("locale is not supported");
  expect(requests).toHaveLength(0);
});

test("page reads preserve locale/version projection and block foreign origins", async () => {
  const tool = docsTool("docs_get_page");
  await expect(
    tool.execute(
      { path: "https://other.example/docs/0.4.0/start-here" },
      options,
    ),
  ).rejects.toThrow("Only public docs paths on this site can be read.");
  expect(requests).toHaveLength(0);
  expect(
    await tool.execute({ path: "/es/docs/0.2.3/extend/mcp/webmcp" }, options),
  ).toBe("Untrusted Ryu Docs page:\nDocumentation result");
  expect(requests[0]?.url.pathname).toBe(
    "/llms.mdx/docs/es/0.2.3/extend/mcp/webmcp",
  );
  expect(new Headers(requests[0]?.init?.headers).get("Accept")).toBe(
    "text/markdown",
  );
});

test("index retains the active route locale and encoded section path", async () => {
  await docsTool("docs_index").execute(
    { section: "extend/mcp", locale: "fr" },
    options,
  );
  expect(requests[0]?.url.href).toBe(
    "https://docs.example/llms-sections/extend%2Fmcp?locale=es",
  );
});

test("service errors and text truncation retain their public responses", async () => {
  responseStatus = 503;
  await expect(docsTool("docs_index").execute({}, options)).rejects.toThrow(
    "The docs service returned HTTP 503.",
  );
  responseStatus = 200;
  responseBody = "x".repeat(8_001);
  expect(await docsTool("docs_index").execute({}, options)).toBe(
    `Untrusted Ryu Docs index:\n${"x".repeat(8_000)}\n\n[truncated]`,
  );
});
