import { defineI18n } from "fumadocs-core/i18n";

export const DOCS_LANGUAGES = [
  "en",
  "es",
  "fr",
  "de",
  "pt-br",
  "ja",
  "zh-cn",
  "it",
  "ko",
  "hi",
  "ru",
  "ar",
] as const;

export type DocsLocale = (typeof DOCS_LANGUAGES)[number];

export const DEFAULT_DOCS_LOCALE = "en" satisfies DocsLocale;

/**
 * Fumadocs owns the URL/content locale contract. The shared Ryu language-pack
 * runtime owns product UI copy; keeping this list in the docs app makes the
 * public docs build self-contained while using the same official locale set.
 */
export const i18n = defineI18n({
  defaultLanguage: DEFAULT_DOCS_LOCALE,
  fallbackLanguage: DEFAULT_DOCS_LOCALE,
  hideLocale: "default-locale",
  languages: [...DOCS_LANGUAGES],
});

export const DOCS_LOCALE_NAMES: Record<DocsLocale, string> = {
  ar: "العربية",
  de: "Deutsch",
  en: "English",
  es: "Español",
  fr: "Français",
  hi: "हिन्दी",
  it: "Italiano",
  ja: "日本語",
  ko: "한국어",
  "pt-br": "Português (Brasil)",
  ru: "Русский",
  "zh-cn": "简体中文",
};

export function isDocsLocale(value: string | undefined): value is DocsLocale {
  return value !== undefined && DOCS_LANGUAGES.includes(value as DocsLocale);
}

export function localeForDocument(locale: string): string {
  try {
    return Intl.getCanonicalLocales(locale)[0] ?? DEFAULT_DOCS_LOCALE;
  } catch {
    return DEFAULT_DOCS_LOCALE;
  }
}

export function directionForDocsLocale(locale: string): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function openGraphLocale(locale: string): string {
  const [language, region] = localeForDocument(locale).split("-");
  return region ? `${language}_${region.toUpperCase()}` : language;
}

/** Add the visible locale prefix used for non-default pages. */
export function localizedPath(path: string, locale: string): string {
  if (!isDocsLocale(locale) || locale === DEFAULT_DOCS_LOCALE) {
    return path;
  }
  if (path === `/${locale}` || path.startsWith(`/${locale}/`)) {
    return path;
  }
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

/** Read the locale prefix from a visible pathname, defaulting to English. */
export function localeFromPathname(pathname: string): DocsLocale {
  const first = pathname.split("/").filter(Boolean)[0];
  return isDocsLocale(first) ? first : DEFAULT_DOCS_LOCALE;
}

/** Validate an optional endpoint locale query without silently accepting typos. */
export function localeFromInput(
  value: string | null | undefined,
): DocsLocale | undefined {
  if (value === null || value === undefined || value.length === 0) {
    return DEFAULT_DOCS_LOCALE;
  }
  return isDocsLocale(value) ? value : undefined;
}
