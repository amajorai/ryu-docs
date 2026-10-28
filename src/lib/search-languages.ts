import type { DocsLocale } from "@/lib/i18n";

/**
 * The Orama tokenizer language used to index and search each docs locale.
 *
 * Fumadocs derives a language from a locale only when the locale is an Orama
 * stemmer code, so `pt-br`, `ja`, `zh-cn`, `ko` and `hi` failed to build an index
 * and every search in them threw. This map only makes every locale build an index.
 * It is a placeholder until localized content exists, not a claim that native-script
 * queries work: almost every page is served in English, so no locale is searched in
 * its own language yet.
 *
 * Orama has no tokenizer for Japanese, Chinese or Korean; those locales use the
 * English one, whose splitter drops every non-Latin character. `hi` uses Orama's
 * `indian` tokenizer, but its splitter keeps only the base letters U+0905 to
 * U+0939, so vowel signs and the virama split a Devanagari word apart.
 *
 * Follow-up: when pages are translated for `hi`, `ja`, `ko` or `zh-cn`, replace
 * these entries with a custom tokenizer (or `normalizationCache`) and test a query
 * in the locale's own script.
 */
export const DOCS_SEARCH_LANGUAGES = {
  ar: "arabic",
  de: "german",
  en: "english",
  es: "spanish",
  fr: "french",
  hi: "indian",
  it: "italian",
  ja: "english",
  ko: "english",
  "pt-br": "portuguese",
  ru: "russian",
  "zh-cn": "english",
} as const satisfies Record<DocsLocale, string>;
