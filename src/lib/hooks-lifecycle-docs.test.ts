import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

// Core declares the phases (`pub const ON_*`); the served manifest schema lists
// them (src/app/schemas/plugin.json/route.test.ts). This keeps the page an author
// reads to learn when each phase fires and which directives it accepts in step.
const hooksPage = fileURLToPath(
  new URL(
    "../../content/docs/extend/develop/extensions/hook-phases.mdx",
    import.meta.url,
  ),
);
const coreHookPhases = fileURLToPath(
  new URL("../../../core/src/plugin_host/mod.rs", import.meta.url),
);

test("the hook phase table has a row for every phase Core declares", async () => {
  const core = await Bun.file(coreHookPhases).text();
  const declared = [
    ...core.matchAll(/^pub const ON_[A-Z_]+: &str = "([a-z_]+)";$/gm),
  ].map((match) => match[1]);
  const page = await Bun.file(hooksPage).text();
  const documented = new Set(
    [...page.matchAll(/^\| \*\*[^|*]+\*\* \| `([a-z_]+)` \|/gm)].map(
      (match) => match[1],
    ),
  );

  expect(declared.length).toBeGreaterThan(0);
  expect(declared.filter((phase) => !documented.has(phase))).toEqual([]);
});

test("the directives reference lists select_model for pre_model_select", async () => {
  const page = await Bun.file(hooksPage).text();
  const row = page
    .split("\n")
    .find((line) => line.startsWith('| `{ kind: "select_model"'));

  expect(row).toBeDefined();
  expect(row).toContain("`pre_model_select`");
});
