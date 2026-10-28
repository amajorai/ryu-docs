import { localeFromInput } from "@/lib/i18n";
import { getLLMText, source } from "@/lib/source";

export const revalidate = false;

export async function GET(request: Request) {
  const locale = localeFromInput(
    new URL(request.url).searchParams.get("locale"),
  );
  if (!locale) {
    return new Response("Unsupported documentation locale", { status: 400 });
  }

  // Release notes are a multi-megabyte changelog archive that grows every
  // release. They stay reachable through llms.txt and
  // /llms-sections/release-notes instead of inflating every full-text fetch.
  const scan = source
    .getPages(locale)
    .filter((page) => page.slugs[0] !== "release-notes")
    .map(getLLMText);
  const scanned = await Promise.all(scan);

  const header = `# Ryu Documentation (Full Text)

This file contains every page of the Ryu documentation in plain Markdown, except the
release notes archive (GET /llms-sections/release-notes).
Each page is delimited by "--- END OF PAGE ---" and starts with a Source/Title/Description header.

Locale: ${locale}
Total pages: ${scanned.length}
Base URL: ${process.env.NEXT_PUBLIC_SITE_URL || "https://docs.ryuhq.com"}

## Other LLM-friendly endpoints

- GET /llms.txt                    — Compact navigation index (sections and their direct children)
- GET /llms/{folder}.txt           — Complete page index for one docs folder, e.g. /llms/extend/mcp.txt
- GET /llms-full.txt               — This file (all pages concatenated)
- GET /llms.mdx/docs/{version}/{slug} — Single English page as processed Markdown
- GET /llms.mdx/docs/{locale}/{version}/{slug} — Localized page projection
- GET /docs/{version}/{path}.md or .mdx — Processed English Markdown (rewrite to /llms.mdx/)
- GET /{locale}/docs/{version}/{path}.md or .mdx — Localized Markdown projection
- GET /docs/{version}/{path} with Accept: text/markdown — Negotiated Markdown
- GET /llms-sections/{section}?locale={locale} — Locale-specific section projection
- GET /schemas/plugin.json         — JSON Schema for manifest.json manifests

Valid sections: start-here, showcase, surfaces, mobile, browser-extension, hardware, core, gateway, standalone, providers, ci, extend, ui, apps, programs, plugins, security, legal, billing, reference, learn, roadmap, rsi, release-notes (legacy names like desktop, develop, mcp, cookbook, and academy still work)

---

`;

  return new Response(header + scanned.join("\n\n--- END OF PAGE ---\n\n"), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
