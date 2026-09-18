import { describe, expect, test } from "bun:test";

import { translations } from "./fumadocs-translations";
import {
  DEFAULT_DOCS_LOCALE,
  DOCS_LANGUAGES,
  DOCS_LOCALE_NAMES,
  directionForDocsLocale,
  i18n,
  localeForDocument,
  localizedPath,
  openGraphLocale,
} from "./i18n";
import {
  generateDocsParams,
  generateDocsPrerenderParams,
  getPage,
  getPageImage,
  source,
} from "./source";

describe("Fumadocs locale contract", () => {
  test("registers every supported Ryu locale with a visible name", () => {
    expect(i18n.defaultLanguage).toBe(DEFAULT_DOCS_LOCALE);
    expect(i18n.hideLocale).toBe("default-locale");
    expect(i18n.fallbackLanguage).toBe(DEFAULT_DOCS_LOCALE);
    expect(i18n.languages).toEqual([...DOCS_LANGUAGES]);

    for (const locale of DOCS_LANGUAGES) {
      expect(localeForDocument(locale)).toBeString();
      expect(localizedPath("/docs/0.4.0/start-here", locale)).toBe(
        locale === DEFAULT_DOCS_LOCALE
          ? "/docs/0.4.0/start-here"
          : `/${locale}/docs/0.4.0/start-here`,
      );
      expect(openGraphLocale(locale)).toBeString();
      expect(directionForDocsLocale(locale)).toBe(
        locale === "ar" ? "rtl" : "ltr",
      );

      const localeTranslations = translations.get(locale);
      expect(localeTranslations?.displayName ?? "English").toBe(
        locale === DEFAULT_DOCS_LOCALE ? "English" : DOCS_LOCALE_NAMES[locale],
      );
      if (locale !== DEFAULT_DOCS_LOCALE) {
        expect(
          localeTranslations?.["Choose a language(language switcher)"],
        ).toBeString();
      }
    }
  });

  test("builds a page tree and fallback page for every locale", () => {
    const languages = source.getLanguages();
    expect(languages.map(({ language }) => language)).toEqual([
      ...DOCS_LANGUAGES,
    ]);

    const pageCounts = new Set(languages.map(({ pages }) => pages.length));
    expect(pageCounts.size).toBe(1);
    for (const { language, pages } of languages) {
      expect(pages.every((page) => page.locale === language)).toBe(true);
      expect(
        pages.every((page) =>
          page.url.startsWith(localizedPath("/docs/0.4.0", language)),
        ),
      ).toBe(true);
    }
    expect(source.getPageTree("es")).toBeDefined();
    expect(source.getPageTree("ar")).toBeDefined();

    const english = getPage(["start-here"], "en");
    const spanish = getPage(["start-here"], "es");
    expect(english?.url).toBe("/docs/0.4.0/start-here");
    expect(spanish?.url).toBe("/es/docs/0.4.0/start-here");
    expect(spanish?.locale).toBe("es");
    expect(spanish?.path).toBe("start-here/index.es.mdx");
    expect(spanish ? getPageImage(spanish).url : undefined).toBe(
      "/og/docs/es/0.4.0/start-here/image-v4.png",
    );
  });

  test("generates static params for each locale without dropping the version", () => {
    const params = generateDocsParams();
    expect(new Set(params.map(({ lang }) => lang))).toEqual(
      new Set(DOCS_LANGUAGES),
    );
    expect(params.every(({ slug }) => slug[0] === "0.4.0")).toBe(true);
  });
  test("keeps every generated API route available without eager duplicate artifacts", () => {
    const all = generateDocsParams();
    const prerendered = generateDocsPrerenderParams();
    const eager = new Set(
      prerendered.map(({ lang, slug }) => `${lang}/${slug.join("/")}`),
    );
    expect(prerendered.length).toBeGreaterThan(0);
    expect(prerendered.length).toBeLessThan(all.length);
    for (const lang of DOCS_LANGUAGES) {
      const localeParams = all.filter((param) => param.lang === lang);
      const deferred = localeParams.filter(
        (param) =>
          param.lang === lang && !eager.has(`${lang}/${param.slug.join("/")}`),
      );
      expect(deferred.length).toBeGreaterThan(0);
      for (const param of localeParams) {
        const page = getPage(param.slug, param.lang);
        expect(page).toBeDefined();
        if (!page) {
          continue;
        }
        const title = page.data.title;
        expect(title).toBeString();
        if (typeof title !== "string") {
          continue;
        }
        expect(title.length).toBeGreaterThan(0);
        const isEager = eager.has(`${lang}/${param.slug.join("/")}`);
        const expectedEager =
          page.data._openapi === undefined &&
          (lang === DEFAULT_DOCS_LOCALE || param.slug.length <= 2);
        expect(isEager).toBe(expectedEager);
      }
      expect(
        deferred.every((param) => {
          const page = getPage(param.slug, param.lang);
          return (
            typeof page?.data.title === "string" && page.data.title.length > 0
          );
        }),
      ).toBe(true);
      expect(prerendered.some((param) => param.lang === lang)).toBe(true);
    }
  });
});
