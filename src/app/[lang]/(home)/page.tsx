import { FeatureRows } from "@/components/home/feature-rows";
import { DocsIndex, Hero } from "@/components/home/hero";
import { JsonLd } from "@/components/json-ld";
import { DOCS_LANGUAGES } from "@/lib/i18n";
import { docsIdentityNodes } from "@/lib/metadata";

/*
 * Laid out like the landing: a full-viewport hero, three feature rows with a
 * figure each, then a plain index of every docs section.
 */
export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": docsIdentityNodes(),
        }}
      />
      <Hero />
      <FeatureRows />
      <DocsIndex />
    </div>
  );
}

export function generateStaticParams() {
  return DOCS_LANGUAGES.map((lang) => ({ lang }));
}
