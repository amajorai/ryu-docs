import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { docsChromeCopy } from "@/lib/docs-chrome-copy";
import { Feedback } from "./client";
import { FeedbackText } from "./text";

const noopSend = () =>
  Promise.resolve({ destinationUrl: "https://example.com", submitted: true });

function renderFeedback(locale: string | undefined): string {
  const copy = locale === undefined ? undefined : docsChromeCopy(locale);
  return renderToStaticMarkup(
    <Feedback copy={copy?.feedback} onSendAction={noopSend} />,
  );
}

test("the page feedback form renders the route's language", () => {
  const cases = [
    ["ja", "このガイドはいかがでしたか？", "よい"],
    ["de", "Wie finden Sie diese Anleitung?", "Gut"],
    ["ar", "ما رأيك في هذا الدليل؟", "جيد"],
  ] as const;
  for (const [locale, title, good] of cases) {
    const html = renderFeedback(locale);
    expect(html).toContain(title);
    expect(html).toContain(good);
    expect(html).not.toContain("How is this guide?");
  }
});

test("the page feedback form stays English without copy", () => {
  const html = renderFeedback(undefined);
  expect(html).toContain("How is this guide?");
  expect(html).toContain("Your feedback helps us make the docs clearer.");
  expect(renderFeedback("en")).toBe(html);
});

test("the section feedback wrapper leaves the prose untouched", () => {
  const html = renderToStaticMarkup(
    <FeedbackText copy={docsChromeCopy("ar")} onSendAction={noopSend}>
      <p>Prose</p>
    </FeedbackText>,
  );
  expect(html).toContain("<p>Prose</p>");
});
