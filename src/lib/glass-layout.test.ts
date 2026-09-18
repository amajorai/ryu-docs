import { expect, test } from "bun:test";

const appRoot = new URL("../app/", import.meta.url);

async function readAppFile(path: string): Promise<string> {
  return Bun.file(new URL(path, appRoot)).text();
}

test("active Fumadocs routes use the Glass layout contract", async () => {
  const [layout, page, globalCss] = await Promise.all([
    readAppFile("[lang]/docs/docs-layout.client.tsx"),
    readAppFile("[lang]/docs/[[...slug]]/page.tsx"),
    readAppFile("global.css"),
  ]);

  expect(layout).toContain(
    'import { GlassLayout } from "fumadocs-ui/layouts/glass";',
  );
  expect(layout).toContain("<GlassLayout");
  expect(page).toContain('from "fumadocs-ui/layouts/glass/page";');
  expect(page).not.toContain("fumadocs-ui/layouts/docs/page");
  expect(globalCss).toContain('@import "fumadocs-ui/css/generated/glass.css";');
  expect(globalCss).toContain(
    '@source "../../node_modules/fumadocs-ui/dist/**/*.{js,mjs}";',
  );
});
