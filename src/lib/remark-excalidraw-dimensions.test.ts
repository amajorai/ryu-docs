import { describe, expect, test } from "bun:test";
import { copyFileSync, mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  remarkExcalidrawDimensions,
  resolvePublicSvg,
} from "./remark-excalidraw-dimensions";

const FIXTURE = join(
  import.meta.dir,
  "../components/mdx/__fixtures__/excalidraw-export.svg",
);

function publicDirWithDiagram(): string {
  const dir = mkdtempSync(join(tmpdir(), "excalidraw-public-"));
  mkdirSync(join(dir, "diagrams"));
  copyFileSync(FIXTURE, join(dir, "diagrams", "flow.excalidraw.svg"));
  return dir;
}

type Attr = { type: string; name: string; value: unknown };

function excalidraw(attributes: Record<string, string>) {
  return {
    type: "mdxJsxFlowElement",
    name: "Excalidraw",
    attributes: Object.entries(attributes).map(
      ([name, value]): Attr => ({ type: "mdxJsxAttribute", name, value }),
    ),
    children: [],
  };
}

function attrs(node: { attributes: Attr[] }): Record<string, unknown> {
  return Object.fromEntries(node.attributes.map((a) => [a.name, a.value]));
}

describe("remarkExcalidrawDimensions", () => {
  test("adds the export's viewBox size to local diagrams", async () => {
    const node = excalidraw({
      src: "/diagrams/flow.excalidraw.svg",
      alt: "Flow",
    });
    const tree = { type: "root", children: [{ type: "p", children: [node] }] };
    await remarkExcalidrawDimensions({ publicDir: publicDirWithDiagram() })(
      tree,
    );
    expect(attrs(node)).toEqual({
      src: "/diagrams/flow.excalidraw.svg",
      alt: "Flow",
      width: "412",
      height: "162",
    });
  });

  test("keeps authored sizes, remote and missing files unchanged", async () => {
    const authored = excalidraw({
      src: "/diagrams/flow.excalidraw.svg",
      width: "100",
    });
    const remote = excalidraw({ src: "https://example.com/a.svg" });
    const missing = excalidraw({ src: "/diagrams/missing.svg" });
    const tree = { type: "root", children: [authored, remote, missing] };
    await remarkExcalidrawDimensions({ publicDir: publicDirWithDiagram() })(
      tree,
    );
    expect(attrs(authored)).toEqual({
      src: "/diagrams/flow.excalidraw.svg",
      width: "100",
    });
    expect(attrs(remote)).toEqual({ src: "https://example.com/a.svg" });
    expect(attrs(missing)).toEqual({ src: "/diagrams/missing.svg" });
  });
});

describe("resolvePublicSvg", () => {
  const root = "/site/public";

  test("maps site-relative SVG paths into public/", () => {
    expect(resolvePublicSvg("/diagrams/a.excalidraw.svg?v=2", root)).toBe(
      "/site/public/diagrams/a.excalidraw.svg",
    );
  });

  test("refuses paths that leave public/, remote URLs and non-SVG files", () => {
    expect(resolvePublicSvg("/../secrets/key.svg", root)).toBeNull();
    expect(resolvePublicSvg("/%2e%2e/secrets/key.svg", root)).toBeNull();
    expect(resolvePublicSvg("//cdn.example/a.svg", root)).toBeNull();
    expect(resolvePublicSvg("https://example.com/a.svg", root)).toBeNull();
    expect(resolvePublicSvg("diagrams/a.svg", root)).toBeNull();
    expect(resolvePublicSvg("/diagrams/a.png", root)).toBeNull();
    expect(resolvePublicSvg("/%E0%A4%A.svg", root)).toBeNull();
  });
});
