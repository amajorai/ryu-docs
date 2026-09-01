import { expect, test } from "bun:test";

const docsRoot = new URL("../../content/docs/", import.meta.url);

async function readPage(path: string): Promise<string> {
  return Bun.file(new URL(path, docsRoot)).text();
}

test("key docs pages pair prose with live UI and diagrams", async () => {
  const [desktop, workflows, approvals, quickstart, primitives, contributions] =
    await Promise.all([
      readPage("surfaces/desktop/user-guide/index.mdx"),
      readPage("core/workflows.mdx"),
      readPage("core/approvals.mdx"),
      readPage("extend/develop/quickstart.mdx"),
      readPage("ui/primitives.mdx"),
      readPage("extend/develop/extensions/contribution-surfaces.mdx"),
    ]);

  expect(desktop).toContain('<SurfacePreview surface="chat" />');
  expect(desktop).toContain("flowchart LR");
  expect(workflows).toContain('<SurfacePreview surface="workflow" />');
  expect(approvals).toContain('<SurfacePreview surface="governance" />');
  expect(approvals).toContain("Human decision");
  expect(quickstart).toContain('<SurfacePreview surface="plugin" />');
  expect(primitives).toContain("@ryu/blocks");
  expect(primitives).toContain("Theme tokens");
  expect(contributions).toContain("share one shell skeleton");
  expect(contributions).not.toContain('<SurfacePreview surface="plugin" />');
  expect(contributions).toContain("Shared shell");
});
