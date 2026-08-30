import { notFound } from "next/navigation";

import { docsPath } from "@/lib/docs-version";
import { getLLMText, source } from "@/lib/source";

export const revalidate = false;

// Section projections can contain most of the docs corpus; generate them only
// when requested so a cold deployment remains bounded.

// Section slugs accepted by /llms-sections/{section}. Values are the URL prefix
// that section owns (relative to /docs/{version}/). Legacy slugs from the
// pre-reorg layout map onto the realm they now live in, so old clients that
// asked for /llms-sections/desktop still get the desktop pages.
const VALID_SECTIONS: Record<string, string> = {
  "start-here": "start-here",
  surfaces: "surfaces",
  mobile: "mobile",
  "browser-extension": "browser-extension",
  core: "core",
  gateway: "gateway",
  providers: "providers",
  extend: "extend",
  apps: "apps",
  plugins: "plugins",
  security: "security",
  billing: "billing",
  reference: "reference",
  learn: "learn",
  // Legacy aliases → the realm that absorbed them.
  desktop: "surfaces/desktop",
  cli: "surfaces/cli",
  island: "surfaces/island",
  raycast: "surfaces/raycast",
  develop: "extend/develop",
  integrate: "extend/integrate",
  skills: "extend/skills",
  mcp: "extend/mcp",
  cookbook: "learn/cookbook",
  academy: "learn/academy",
  defaults: "reference/defaults",
  benchmark: "reference/benchmark",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ section: string }> },
) {
  const { section } = await params;
  const prefix = VALID_SECTIONS[section];

  if (!prefix) {
    notFound();
  }

  const pages = source
    .getPages()
    .filter(
      (page) =>
        page.url === docsPath(...prefix.split("/")) ||
        page.url.startsWith(`${docsPath(...prefix.split("/"))}/`),
    );

  if (pages.length === 0) {
    notFound();
  }

  const scanned = await Promise.all(pages.map(getLLMText));

  const header = `# Ryu Docs — ${section}

Section: ${section}
Pages: ${scanned.length}
Base URL: ${process.env.NEXT_PUBLIC_SITE_URL || "https://docs.ryuhq.com"}

Each page below starts with a Source/Title header followed by its full Markdown content.

---

`;

  return new Response(header + scanned.join("\n\n--- END OF PAGE ---\n\n"), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
