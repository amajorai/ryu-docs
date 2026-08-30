import { describe, expect, test } from "bun:test";
import { DOCS_WEBMCP_TOOL_SPECS } from "./webmcp-provider";

describe("docs WebMCP contract", () => {
  test("publishes read-only docs tools with untrusted output hints", () => {
    expect(DOCS_WEBMCP_TOOL_SPECS.map((tool) => tool.name)).toEqual([
      "docs_search",
      "docs_get_page",
      "docs_index",
    ]);
    for (const tool of DOCS_WEBMCP_TOOL_SPECS) {
      expect(tool.annotations).toEqual({
        readOnlyHint: true,
        untrustedContentHint: true,
      });
    }
  });
});
