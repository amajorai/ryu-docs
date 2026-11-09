import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { hiddenProductListings } from "@ryu/auth/lib/product-launch-flags";
import {
  allFooterLinks,
  FOOTER_COLUMNS,
  FOOTER_COMMUNITY_LINKS,
  FOOTER_LEGAL_LINKS,
  FOOTER_START_LINKS,
  FOOTER_TAGLINE,
} from "@ryu/blocks/web/footer-links.ts";
import { renderToStaticMarkup } from "react-dom/server";
import { docsChromeCopy } from "@/lib/docs-chrome-copy";
import { MAIN_SITE_URL } from "@/lib/layout.shared";
import {
  DOCS_FOOTER_COLUMNS,
  docsSiteFooterHref,
  SiteFooter,
} from "./site-footer";

const html = renderToStaticMarkup(<SiteFooter />);
const anchors = [...html.matchAll(/<a [^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/g)];

test("the docs footer renders exactly the landing footer's links, in order", () => {
  const rendered = anchors.map(([, href, label]) => ({ href, label }));
  // Render order: lead band (community, then calls to action), columns, legal.
  const expected = [
    ...FOOTER_COMMUNITY_LINKS,
    ...FOOTER_START_LINKS,
    ...DOCS_FOOTER_COLUMNS.flatMap((column) => column.links),
    ...FOOTER_LEGAL_LINKS,
  ].map((link) => ({ href: docsSiteFooterHref(link), label: link.label }));
  expect(rendered).toEqual(expected);
  const hidden = hiddenProductListings(null);
  const visibleShared = allFooterLinks().filter(
    (link) => !hidden.some((slug) => link.href === `/products/${slug}`),
  );
  expect(expected).toHaveLength(visibleShared.length);
});

test("the docs footer hides closed and unlaunched products under default flags", () => {
  const hrefs = anchors.map(([, href]) => href);
  for (const slug of hiddenProductListings(null)) {
    expect(hrefs).not.toContain(`${MAIN_SITE_URL}/products/${slug}`);
  }
  // services.mail and catalog.workflows default off.
  expect(hrefs).not.toContain(`${MAIN_SITE_URL}/products/mail`);
  expect(hrefs).not.toContain(`${MAIN_SITE_URL}/products/workflows`);
  expect(hrefs).toContain(`${MAIN_SITE_URL}/products/core`);
});

test("the docs footer shows every shared column title and the tagline", () => {
  expect(DOCS_FOOTER_COLUMNS.map((column) => column.title)).toEqual(
    FOOTER_COLUMNS.map((column) => column.title),
  );
  for (const column of FOOTER_COLUMNS) {
    expect(html).toContain(`>${column.title}</p>`);
  }
  expect(html).toContain(FOOTER_TAGLINE);
  expect(html).toContain(
    "grid grid-cols-2 gap-x-6 gap-y-10 py-12 md:grid-cols-3 md:gap-x-8 md:py-16 xl:grid-cols-6",
  );
});

test("docs links stay on the docs site; other links go to the main site", () => {
  expect(
    docsSiteFooterHref({ href: "/docs", kind: "docs", label: "Docs" }),
  ).toBe("/docs");
  expect(
    docsSiteFooterHref({
      href: "/docs/standalone/sdk/openapi",
      kind: "docs",
      label: "API reference",
    }),
  ).toBe("/docs/standalone/sdk/openapi");
  expect(docsSiteFooterHref({ href: "/pricing", label: "Pricing" })).toBe(
    `${MAIN_SITE_URL}/pricing`,
  );
  expect(
    docsSiteFooterHref({
      href: "https://x.com/ryuhq",
      kind: "external",
      label: "X",
    }),
  ).toBe("https://x.com/ryuhq");
  expect(html).toContain('aria-label="Ryu on X"');
  expect(html.match(/href="https:\/\/ryuhq\.com\/contact"/g)).toHaveLength(1);
});

test("the docs footer keeps no hand-copied link table", () => {
  // The columns must come from the landing data, not a local copy.
  const source = readFileSync(
    new URL("./site-footer.tsx", import.meta.url),
    "utf8",
  );
  expect(source).toContain('from "@ryu/blocks/web/footer-links.ts"');
  expect(source).not.toMatch(/const FOOTER_COLUMNS\b/);
  expect(source).not.toContain('label: "');
});

test("the docs footer names its nav landmarks in the route's language", () => {
  for (const label of ["Community", "Get started", "Footer", "Legal"]) {
    expect(html).toContain(`<nav aria-label="${label}"`);
  }
  const arabic = renderToStaticMarkup(
    <SiteFooter landmarks={docsChromeCopy("ar").landmarks} />,
  );
  const { community, footer, getStarted, legal } =
    docsChromeCopy("ar").landmarks;
  for (const label of [community, getStarted, footer, legal]) {
    expect(arabic).toContain(`aria-label="${label}"`);
  }
  expect(arabic).not.toContain('aria-label="Community"');
});
