"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { DiagramLightbox, DiagramTrigger } from "./diagram-lightbox";
import { parseSvgViewBox } from "./diagram-viewbox";
import styles from "./mermaid.module.css";
import { describeMermaidChart } from "./mermaid-description";
import {
  browserFontEnvironment,
  embedFontCss,
  resolveMermaidFont,
} from "./mermaid-font";
import { renderExclusively } from "./mermaid-queue";

/**
 * Renders a Mermaid diagram. Used both directly as `<Mermaid chart="..." />`
 * and as the target of the `remarkMdxMermaid` plugin, which rewrites
 * ```mermaid fenced code blocks into this component at build time.
 *
 * Clicking the diagram opens a fullscreen dialog with pan and zoom support.
 */
export function Mermaid({ chart }: { chart: string }) {
  const id = useId();
  const [svg, setSvg] = useState("");
  const [renderState, setRenderState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const currentChartRef = useRef<string | null>(null);
  const { resolvedTheme } = useTheme();
  const [dialogOpen, setDialogOpen] = useState(false);
  const description = useMemo(() => describeMermaidChart(chart), [chart]);

  useEffect(() => {
    const cacheKey = `${resolvedTheme}:${chart}`;
    if (currentChartRef.current === cacheKey) {
      return;
    }
    currentChartRef.current = cacheKey;

    let cancelled = false;
    setRenderState("loading");
    setSvg("");

    const render = async () => {
      const source = chart.replaceAll("\\n", "\n");
      const [{ default: mermaid }, font] = await Promise.all([
        import("mermaid"),
        // The SVG is painted as an isolated image, which cannot inherit the
        // page font; see mermaid-font.ts.
        resolveMermaidFont(source, browserFontEnvironment()),
      ]);
      if (cancelled) {
        return;
      }
      const { svg: rendered } = await renderExclusively(() => {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "loose",
          fontFamily: font.fontFamily,
          theme: resolvedTheme === "dark" ? "dark" : "default",
        });
        return mermaid.render(
          `mermaid-${id.replace(/[^a-zA-Z0-9]/g, "")}`,
          source,
        );
      });
      if (cancelled) {
        return;
      }
      setRenderState("ready");
      setSvg(embedFontCss(rendered, font.css));
    };

    render().catch(() => {
      if (!cancelled) {
        currentChartRef.current = null;
        setRenderState("error");
        setSvg("");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [chart, id, resolvedTheme]);

  const openDialog = useCallback(() => {
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
  }, []);

  if (renderState === "loading") {
    return (
      <div
        aria-label="Loading diagram"
        className="my-4 flex min-h-32 items-center justify-center rounded-xl bg-fd-secondary/40 text-fd-muted-foreground text-sm"
        role="status"
      >
        <span className="motion-reduce:animate-none animate-pulse">
          Loading diagram…
        </span>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-4">
        <p className="mb-3 text-fd-muted-foreground text-sm" role="alert">
          Diagram unavailable. Mermaid source is shown below.
        </p>
        <pre className="overflow-x-auto rounded-lg bg-fd-secondary/50 p-4 text-sm">
          <code>{chart}</code>
        </pre>
      </div>
    );
  }

  return (
    <>
      <MermaidPreview description={description} onOpen={openDialog} svg={svg} />
      {dialogOpen ? (
        <DiagramLightbox onClose={closeDialog} size={parseSvgViewBox(svg)}>
          <MermaidImage alt={description} expanded svg={svg} />
        </DiagramLightbox>
      ) : null}
    </>
  );
}

/**
 * Inline diagram. A button's name comes from its `aria-label`, not from the
 * image inside it, so the label carries the chart's text equivalent too.
 */
export function MermaidPreview({
  description,
  onOpen,
  svg,
}: {
  /** Text equivalent; see `describeMermaidChart`. */
  description: string;
  onOpen: () => void;
  svg: string;
}) {
  return (
    <DiagramTrigger label={`Expand diagram: ${description}`} onOpen={onOpen}>
      <MermaidImage alt={description} svg={svg} />
    </DiagramTrigger>
  );
}

/**
 * Image documents isolate SVG scripts and markup from the surrounding page.
 * They also cannot see the page's CSS or web fonts, so any font the diagram
 * needs must be embedded in `svg` (see `embedFontCss`).
 */
export function MermaidImage({
  alt = "Mermaid diagram",
  svg,
  expanded = false,
}: {
  /** Text equivalent; see `describeMermaidChart`. */
  alt?: string;
  svg: string;
  expanded?: boolean;
}) {
  const content = useMemo(() => parseSvgViewBox(svg), [svg]);
  // Embedded fonts make `svg` large; encode once, not on every pan or zoom.
  const src = useMemo(
    () => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    [svg],
  );
  return (
    <Image
      alt={alt}
      className={expanded ? styles.expandedImage : styles.previewImage}
      height={content.height > 0 ? content.height : 800}
      src={src}
      unoptimized
      width={content.width > 0 ? content.width : 1200}
    />
  );
}
