import { notFound } from "next/navigation";

import { DEFAULT_DOCS_LOCALE, isDocsLocale } from "@/lib/i18n";
import { renderDocsOgCard } from "@/lib/og-card";
import { getPage } from "@/lib/source";

export const revalidate = 86400;

// OG images are cheap to generate on demand; pre-rendering one for every doc
// page needlessly triples the cold production build.

export async function GET(
  _req: Request,
  { params }: RouteContext<"/og/docs/[...slug]">,
) {
  const { slug: rawSlug } = await params;
  const locale = isDocsLocale(rawSlug[0]) ? rawSlug[0] : DEFAULT_DOCS_LOCALE;
  const slug = isDocsLocale(rawSlug[0]) ? rawSlug.slice(1) : rawSlug;
  const page = getPage(slug.slice(0, -1), locale);
  if (!page) notFound();

  return renderDocsOgCard({
    title: page.data.title,
  });
}
