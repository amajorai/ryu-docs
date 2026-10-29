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
  expect(globalCss).toContain(
    "#nd-sidebar [data-radix-scroll-area-viewport] > div",
  );
  expect(globalCss).toContain("display: flex !important;");
  expect(globalCss).toContain("@media (width >= 48rem)");
  expect(globalCss).toContain(
    '--docs-glass-grid-areas: "left-margin left main right right-margin";',
  );
  expect(globalCss).toContain("--docs-glass-grid-columns:");
  expect(globalCss).toContain("var(--fd-left-width)");
});

test("docs and home pages share the landing-matched site header", async () => {
  const [docsLayout, homeLayout, globalCss] = await Promise.all([
    readAppFile("[lang]/docs/docs-layout.client.tsx"),
    readAppFile("[lang]/(home)/layout.tsx"),
    readAppFile("global.css"),
  ]);

  expect(docsLayout).toContain("<SiteHeader");
  expect(docsLayout).toContain("header: DocsHeader");
  expect(homeLayout).toContain("<SiteHeader transparent />");
  expect(homeLayout).toContain("<SiteFooter />");
  expect(homeLayout).toContain("enabled: false");
  expect(globalCss).toContain("--site-header-height:");
  expect(globalCss).toContain(
    "#fd-glass-layout > [data-docs-main] > [data-fd-full]",
  );
});
