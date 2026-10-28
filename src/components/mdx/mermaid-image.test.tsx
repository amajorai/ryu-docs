import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MermaidImage, MermaidPreview } from "./mermaid";

test("renders diagrams as images with intrinsic dimensions", () => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><text>Diagram</text></svg>';
  const markup = renderToStaticMarkup(<MermaidImage svg={svg} />);
  expect(markup).toContain('width="320"');
  expect(markup).toContain('height="180"');
  expect(markup).toContain('alt="Mermaid diagram"');
  expect(markup).toContain(
    `src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}"`,
  );
  expect(markup).not.toContain("<svg");
});

test("keeps active SVG markup inside the isolated image document", () => {
  const svg =
    '<svg viewBox="0 0 40 20"><script>window.evil = true</script><foreignObject><div onclick="evil()">Label</div></foreignObject></svg>';
  const markup = renderToStaticMarkup(<MermaidImage svg={svg} expanded />);
  expect(markup).not.toContain("<script>");
  expect(markup).not.toContain("<foreignObject>");
  expect(markup).not.toContain('onclick="evil()"');
  expect(markup).toContain(encodeURIComponent(svg));
});

test("uses finite fallback dimensions for diagrams without a valid viewBox", () => {
  const markup = renderToStaticMarkup(
    <MermaidImage svg='<svg viewBox="0 0 NaN -1"></svg>' />,
  );
  expect(markup).toContain('width="1200"');
  expect(markup).toContain('height="800"');
});

test("rejects negative intrinsic dimensions", () => {
  const markup = renderToStaticMarkup(
    <MermaidImage svg='<svg viewBox="0 0 -10 -20"></svg>' />,
  );
  expect(markup).toContain('width="1200"');
  expect(markup).toContain('height="800"');
});

test("uses the provided text equivalent as alt text", () => {
  const markup = renderToStaticMarkup(
    <MermaidImage
      alt="Flowchart: Desktop, Core"
      svg='<svg viewBox="0 0 10 10"></svg>'
    />,
  );
  expect(markup).toContain('alt="Flowchart: Desktop, Core"');
});

test("names the inline expand button with the chart's text equivalent", () => {
  const markup = renderToStaticMarkup(
    <MermaidPreview
      description="Flowchart: Desktop, Core"
      onOpen={() => undefined}
      svg='<svg viewBox="0 0 10 10"></svg>'
    />,
  );
  // aria-label overrides the image's alt, so it must carry the description.
  expect(markup).toContain(
    'aria-label="Expand diagram: Flowchart: Desktop, Core"',
  );
  // A title would become the accessible description and repeat the action.
  expect(markup).not.toContain("title=");
  expect(markup).toContain('aria-hidden="true"');
});
