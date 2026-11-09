import { EnglishFallbackRegion } from "@/components/english-fallback-region";
import { FeatureRows } from "@/components/home/feature-rows";
import { DocsIndex, Hero } from "@/components/home/hero";
import { JsonLd } from "@/components/json-ld";
import { DEFAULT_DOCS_LOCALE, DOCS_LANGUAGES } from "@/lib/i18n";
import { docsIdentityNodes } from "@/lib/metadata";

/*
 * Laid out like the landing: a full-viewport hero, three feature rows with a
 * figure each, then a plain index of every docs section.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return (
    <div className="flex flex-1 flex-col">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": docsIdentityNodes(),
        }}
      />
      {/* The home content is English in every locale (metadata.ts), so locale
          routes tag it English and left-to-right. */}
      <EnglishFallbackRegion fallback={lang !== DEFAULT_DOCS_LOCALE}>
        <Hero />
        <FeatureRows />
        <DocsIndex />
      </EnglishFallbackRegion>
    </div>
  );
}

export function generateStaticParams() {
  return DOCS_LANGUAGES.map((lang) => ({ lang }));
}
