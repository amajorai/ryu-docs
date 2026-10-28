import { llms } from "fumadocs-core/source";

import {
  hasLocalizedDocsContent,
  isCanonicalDocsPage,
} from "@/lib/canonical-docs";
import { DEFAULT_DOCS_LOCALE, localeFromInput } from "@/lib/i18n";
import { buildRootLlmsIndex } from "@/lib/llms-index";
import { siteConfig } from "@/lib/metadata";
import { source } from "@/lib/source";

export const revalidate = false;

export function GET(request: Request) {
  const locale = localeFromInput(
    new URL(request.url).searchParams.get("locale"),
  );
  if (!locale) {
    return new Response("Unsupported documentation locale", { status: 400 });
  }

  // English is a compact navigation index with per-folder indexes under
  // /llms/; a localized index lists only that locale's translated pages.
  const body =
    locale === DEFAULT_DOCS_LOCALE
      ? buildRootLlmsIndex()
      : [
          llms(source).index(locale).split("\n", 1)[0],
          "",
          "Only translated pages are listed for this locale. For the complete documentation, use the [English index](/llms.txt).",
          "",
          ...source
            .getPages(locale)
            .filter(
              (page) =>
                hasLocalizedDocsContent(page) &&
                isCanonicalDocsPage(page.slugs),
            )
            .map(
              (page) =>
                `- [${page.data.title}](${siteConfig.url}${page.url}): ${page.data.description ?? "Documentation page"}`,
            ),
          "",
        ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
