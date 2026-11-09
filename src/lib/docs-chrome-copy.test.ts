import { expect, test } from "bun:test";
import { DOCS_BLOCK_FEEDBACK_COPY } from "./docs-block-feedback-copy";
import { docsChromeCopy } from "./docs-chrome-copy";
import { DOCS_FEEDBACK_COPY } from "./docs-feedback-copy";
import { DOCS_LANGUAGES } from "./i18n";

const english = docsChromeCopy("en");

test("every docs locale has every chrome string", () => {
  for (const locale of DOCS_LANGUAGES) {
    const copy = docsChromeCopy(locale);
    for (const group of ["blockFeedback", "feedback", "landmarks"] as const) {
      expect(Object.keys(copy[group]).sort()).toEqual(
        Object.keys(english[group]).sort(),
      );
      for (const value of Object.values(copy[group])) {
        expect(value.trim().length).toBeGreaterThan(0);
      }
    }
  }
  expect(Object.keys(DOCS_FEEDBACK_COPY).sort()).toEqual(
    [...DOCS_LANGUAGES].sort(),
  );
  expect(Object.keys(DOCS_BLOCK_FEEDBACK_COPY).sort()).toEqual(
    [...DOCS_LANGUAGES].sort(),
  );
});

test("non-English locales translate the feedback prompts", () => {
  for (const locale of DOCS_LANGUAGES.filter((code) => code !== "en")) {
    const copy = docsChromeCopy(locale);
    expect(copy.feedback.title).not.toBe(english.feedback.title);
    expect(copy.feedback.improvePrompt).not.toBe(
      english.feedback.improvePrompt,
    );
    expect(copy.blockFeedback.hint).not.toBe(english.blockFeedback.hint);
    expect(copy.landmarks.github).toContain("GitHub");
    expect(copy.blockFeedback.hint).toMatch(/Ryu[ -]Docs/);
  }
});

test("the copy carries the route's language and direction", () => {
  expect(docsChromeCopy("ar")).toMatchObject({ dir: "rtl", lang: "ar" });
  expect(docsChromeCopy("pt-br")).toMatchObject({ dir: "ltr", lang: "pt-BR" });
  expect(docsChromeCopy("ar").feedback.submit).toBe("إرسال الملاحظات");
});

test("unknown or missing locales fall back to English", () => {
  expect(docsChromeCopy("xx")).toEqual(english);
  expect(docsChromeCopy(undefined)).toEqual(english);
  expect(english.feedback.title).toBe("How is this guide?");
});
