import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Excalidraw } from "./excalidraw";

function imgTags(markup: string): string[] {
  return markup.match(/<img\b[^>]*>/g) ?? [];
}

describe("<Excalidraw> server markup", () => {
  test("renders a lazy, sized image inside a labelled expand button", () => {
    const markup = renderToStaticMarkup(
      <Excalidraw
        alt="Desktop calls Core"
        height="162"
        src="/diagrams/flow.excalidraw.svg"
        width="412"
      />,
    );
    expect(markup).toContain(
      '<button aria-label="Expand diagram: Desktop calls Core"',
    );
    expect(markup).toContain('type="button"');
    const [img, ...rest] = imgTags(markup);
    expect(rest).toEqual([]);
    expect(img).toContain('src="/diagrams/flow.excalidraw.svg"');
    expect(img).toContain('alt="Desktop calls Core"');
    expect(img).toContain('loading="lazy"');
    expect(img).toContain('decoding="async"');
    expect(img).toContain('width="412"');
    expect(img).toContain('height="162"');
    // The lightbox is not in the page until the reader opens it.
    expect(markup).not.toContain("<dialog");
  });

  test("without darkSrc, the one export carries the dark-mode invert class", () => {
    const [img] = imgTags(
      renderToStaticMarkup(<Excalidraw alt="A" src="/a.excalidraw.svg" />),
    );
    expect(img).not.toContain("dark:hidden");
    expect(img).not.toContain("hidden dark:block");
    expect(img).toContain("dark:[filter:invert(93%)_hue-rotate(180deg)]");
  });

  test("with darkSrc, CSS switches between the two exports", () => {
    const [light, dark] = imgTags(
      renderToStaticMarkup(
        <Excalidraw
          alt="A"
          darkSrc="/a-dark.excalidraw.svg"
          src="/a.excalidraw.svg"
        />,
      ),
    );
    expect(light).toContain('src="/a.excalidraw.svg"');
    expect(light).toContain("dark:hidden");
    expect(dark).toContain('src="/a-dark.excalidraw.svg"');
    expect(dark).toContain("hidden dark:block");
    expect(`${light}${dark}`).not.toContain("invert(");
  });

  test("omits unknown sizes so the browser keeps the aspect ratio", () => {
    const [img] = imgTags(
      renderToStaticMarkup(<Excalidraw alt="A" src="/a.svg" width="wide" />),
    );
    expect(img).not.toContain("width=");
    expect(img).not.toContain("height=");
    expect(img).toContain("h-auto max-w-full");
  });

  test("renders the caption as the figure caption", () => {
    const markup = renderToStaticMarkup(
      <Excalidraw alt="A" caption="Request path" src="/a.svg" />,
    );
    expect(markup).toStartWith("<figure");
    expect(markup).toMatch(/<figcaption[^>]*>Request path<\/figcaption>/);
    expect(
      renderToStaticMarkup(<Excalidraw alt="A" src="/a.svg" />),
    ).not.toContain("<figcaption");
  });
});
