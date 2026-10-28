import { describe, expect, test } from "bun:test";

import { escapeMdxProseBraces } from "./mdx-prose";

describe("escapeMdxProseBraces", () => {
  test("a literal backslash inside code cannot escape its closing delimiter", () => {
    expect(escapeMdxProseBraces("Use `{code}\\` then {prose}.")).toBe(
      "Use `{code}\\` then &#123;prose&#125;.",
    );
    expect(escapeMdxProseBraces("Use ``{code}`\\`` then {prose}.")).toBe(
      "Use ``{code}`\\`` then &#123;prose&#125;.",
    );
  });

  test("normalizes em dashes only in prose while preserving literal code bytes", () => {
    expect(
      escapeMdxProseBraces("Before—{prose} `a — {code}` after — done"),
    ).toBe("Before - &#123;prose&#125; `a — {code}` after - done");
    expect(escapeMdxProseBraces("``a—`{code}```b`` — {after}")).toBe(
      "``a—`{code}```b`` - &#123;after&#125;",
    );
  });
  test("escapes prose braces while preserving braces in matching code spans", () => {
    expect(
      escapeMdxProseBraces(
        "Use {value}, `JSON {ok: true}`, and `` `nested {code}` ``.",
      ),
    ).toBe(
      "Use &#123;value&#125;, `JSON {ok: true}`, and `` `nested {code}` ``.",
    );
  });

  test("escapes angle brackets in prose but not in code spans", () => {
    expect(
      escapeMdxProseBraces("Open https://x.test/scan/<domain> or `/scan/<domain>`."),
    ).toBe("Open https://x.test/scan/&lt;domain> or `/scan/<domain>`.");
  });

  test("does not treat escaped or unmatched backticks as code span delimiters", () => {
    expect(
      escapeMdxProseBraces("Escape \\` and {keep} `unfinished {brace}"),
    ).toBe("Escape \\` and &#123;keep&#125; `unfinished &#123;brace&#125;");
  });
});
