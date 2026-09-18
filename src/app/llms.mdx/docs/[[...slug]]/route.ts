import { notFound } from "next/navigation";

import { DEFAULT_DOCS_LOCALE, isDocsLocale } from "@/lib/i18n";
import { getLLMText, getPage } from "@/lib/source";

export const revalidate = false;

// Keep the Markdown projection on demand instead of compiling the full docs
// corpus a second time during every production build.

export async function GET(
  _req: Request,
  { params }: RouteContext<"/llms.mdx/docs/[[...slug]]">,
) {
  const { slug: rawSlug = [] } = await params;
  const locale = isDocsLocale(rawSlug[0]) ? rawSlug[0] : DEFAULT_DOCS_LOCALE;
  const slug = isDocsLocale(rawSlug[0]) ? rawSlug.slice(1) : rawSlug;
  const page = getPage(slug, locale);
  if (!page) notFound();

  return new Response(await getLLMText(page), {
    headers: {
      "Cache-Control": "public, max-age=86400",
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
