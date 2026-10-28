import { notFound } from "next/navigation";

import { DOCS_SECTIONS, isDocsSection } from "@/lib/docs-sections";
import { docsPathForLocale } from "@/lib/docs-version";
import { localeFromInput } from "@/lib/i18n";
import {
  isReleaseNotesPage,
  splitReleaseNotesForLlms,
} from "@/lib/release-notes-docs";
import { getLLMText, source } from "@/lib/source";

export const revalidate = false;

// Section projections can contain most of the docs corpus; generate them only
// when requested so a cold deployment remains bounded.

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ section: string }> },
) {
  const { section } = await params;
  const locale = localeFromInput(new URL(_req.url).searchParams.get("locale"));
  if (!locale) {
    return new Response("Unsupported documentation locale", { status: 400 });
  }
  if (!isDocsSection(section)) {
    notFound();
  }
  const prefix = DOCS_SECTIONS[section];

  const sectionPath = docsPathForLocale(locale, ...prefix.split("/"));

  const pages = source
    .getPages(locale)
    .filter(
      (page) =>
        page.url === sectionPath || page.url.startsWith(`${sectionPath}/`),
    );

  if (pages.length === 0) {
    notFound();
  }

  // The release notes archive is about 2 MB; inline only the index and the
  // newest releases and link the rest, so the section stays a bounded response.
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://docs.ryuhq.com";
  const { full, linked } = pages.every((page) => isReleaseNotesPage(page.slugs))
    ? splitReleaseNotesForLlms(pages)
    : { full: pages, linked: [] };

  const scanned = await Promise.all(full.map(getLLMText));
  const olderReleases = linked.length
    ? `\n\n--- END OF PAGE ---\n\n## Older releases (${linked.length})\n\nThese pages are not inlined; fetch each URL for its notes.\n\n${linked
        .map(
          (page) =>
            `- [${page.data.title}](${baseUrl}${page.url})${page.data.description ? `: ${page.data.description}` : ""}`,
        )
        .join("\n")}\n`
    : "";

  const header = `# Ryu Docs — ${section}

Locale: ${locale}
Section: ${section}
Pages: ${pages.length}
Base URL: ${baseUrl}

Each page below starts with a Source/Title header followed by its full Markdown content.

---

`;

  return new Response(
    header + scanned.join("\n\n--- END OF PAGE ---\n\n") + olderReleases,
    {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
      },
    },
  );
}
