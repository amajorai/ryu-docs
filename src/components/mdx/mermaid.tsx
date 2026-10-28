"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import styles from "./mermaid.module.css";
import { describeMermaidChart } from "./mermaid-description";
import {
  browserFontEnvironment,
  embedFontCss,
  resolveMermaidFont,
} from "./mermaid-font";
import { renderExclusively } from "./mermaid-queue";
import { installMermaidWheelZoom } from "./mermaid-wheel";

type MermaidTransform = CSSProperties & {
  "--mermaid-x": string;
  "--mermaid-y": string;
  "--mermaid-scale": number;
};

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
        <MermaidDialog alt={description} onClose={closeDialog} svg={svg} />
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
    <>
      <button
        aria-label={`Expand diagram: ${description}`}
        className="peer relative flex w-full cursor-pointer justify-center border-0 bg-transparent p-0"
        onClick={onOpen}
        type="button"
      >
        <MermaidImage alt={description} svg={svg} />
      </button>
      <span
        aria-hidden="true"
        className="block text-center text-fd-muted-foreground text-xs opacity-0 transition-opacity peer-hover:opacity-100 peer-focus-visible:opacity-100"
      >
        Click to expand
      </span>
    </>
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
  const content = useMemo(() => prepareSvg(svg), [svg]);
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

const ZOOM_MIN = 0.05;
const ZOOM_MAX = Number.POSITIVE_INFINITY;
/** Keyboard pan distance in CSS pixels; Shift uses the larger step. */
const PAN_STEP = 40;
const PAN_STEP_LARGE = 160;
/** Upper bound for the automatic fit, so tiny diagrams don't fill the screen. */
const FIT_MAX = 4;
/** Breathing room, in px, kept between the diagram and the viewport edges. */
const FIT_PADDING = 48;

type SvgContent = { width: number; height: number };

const VIEWBOX_RE = /viewBox="([^"]+)"/;

/** The image dimensions use Mermaid's intrinsic viewBox for dialog fitting. */
function prepareSvg(svg: string): SvgContent {
  const parts =
    svg
      .match(VIEWBOX_RE)?.[1]
      .split(/[\s,]+/)
      .map(Number) ?? [];
  const valid = parts.length === 4 && parts.every(Number.isFinite);
  const width = valid ? (parts[2] ?? 0) : 0;
  const height = valid ? (parts[3] ?? 0) : 0;
  return { width, height };
}

function MermaidDialog({
  alt,
  onClose,
  svg,
}: {
  alt: string;
  onClose: () => void;
  svg: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const viewportHintId = useId();
  const [scale, setScale] = useState(1);
  const [measured, setMeasured] = useState(false);
  const fitScaleRef = useRef(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
  });

  const content = useMemo(() => prepareSvg(svg), [svg]);

  const computeFit = useCallback(() => {
    const viewport = viewportRef.current;
    if (!(viewport && content.width > 0 && content.height > 0)) {
      return null;
    }
    const rect = viewport.getBoundingClientRect();
    const fit = Math.min(
      (rect.width - FIT_PADDING) / content.width,
      (rect.height - FIT_PADDING) / content.height,
    );
    return Math.min(FIT_MAX, Math.max(ZOOM_MIN, fit));
  }, [content.width, content.height]);

  // showModal() and the fit measurement must happen in this order: a closed
  // <dialog> is display:none, so the viewport would measure 0x0 before it.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
    const fit = computeFit();
    if (fit !== null) {
      fitScaleRef.current = fit;
      setScale(fit);
      setOffset({ x: 0, y: 0 });
    }
    setMeasured(true);
  }, [computeFit]);

  useEffect(() => {
    const body = document.body;
    const overflow = body.style.overflow;
    const padding = body.style.paddingRight;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    const base = Number.parseFloat(getComputedStyle(body).paddingRight) || 0;

    body.style.overflow = "hidden";
    if (gap > 0) {
      body.style.paddingRight = `${base + gap}px`;
    }

    return () => {
      body.style.overflow = overflow;
      body.style.paddingRight = padding;
    };
  }, []);

  // Keep the Fit target current on resize, but never override the zoom the
  // reader has chosen since opening.
  useEffect(() => {
    const onResize = () => {
      const fit = computeFit();
      if (fit !== null) {
        fitScaleRef.current = fit;
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [computeFit]);

  const zoomMin = Math.min(ZOOM_MIN, fitScaleRef.current);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    return installMermaidWheelZoom(viewport, (factor) => {
      setScale((prev) => Math.min(ZOOM_MAX, Math.max(zoomMin, prev * factor)));
    });
  }, [zoomMin]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      dragRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        startOffsetX: offset.x,
        startOffsetY: offset.y,
      };
      if (e.target instanceof Element) {
        e.target.setPointerCapture(e.pointerId);
      }
    },
    [offset],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset({
      x: dragRef.current.startOffsetX + dx,
      y: dragRef.current.startOffsetY + dy,
    });
  }, []);

  const handlePointerUp = useCallback(() => {
    dragRef.current.active = false;
  }, []);

  const resetView = useCallback(() => {
    setScale(fitScaleRef.current);
    setOffset({ x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(ZOOM_MAX, s * 1.25));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(zoomMin, s * 0.8));
  }, [zoomMin]);

  // Keyboard alternative to drag-panning (WCAG 2.1.1 / 2.5.7): arrows pan,
  // Shift pans further, +/- zoom and 0 fits, reusing the toolbar actions.
  const handleViewportKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const step = event.shiftKey ? PAN_STEP_LARGE : PAN_STEP;
      const pan: Record<string, { x: number; y: number }> = {
        ArrowDown: { x: 0, y: -step },
        ArrowLeft: { x: step, y: 0 },
        ArrowRight: { x: -step, y: 0 },
        ArrowUp: { x: 0, y: step },
      };
      const delta = pan[event.key];
      if (delta) {
        event.preventDefault();
        setOffset((prev) => ({ x: prev.x + delta.x, y: prev.y + delta.y }));
        return;
      }
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomIn();
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        zoomOut();
      } else if (event.key === "0") {
        event.preventDefault();
        resetView();
      }
    },
    [resetView, zoomIn, zoomOut],
  );

  const handleDialogClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === dialogRef.current) {
        onClose();
      }
    },
    [onClose],
  );

  const canvasStyle: MermaidTransform = {
    "--mermaid-x": `${offset.x}px`,
    "--mermaid-y": `${offset.y}px`,
    "--mermaid-scale": scale,
  };

  return createPortal(
    <dialog
      aria-label="Expanded diagram view"
      className="backdrop:bg-fd-background/80 m-0 h-dvh max-h-none w-dvw max-w-none border-0 bg-transparent p-0 shadow-2xl backdrop:backdrop-blur-sm open:flex open:fixed open:inset-0 open:z-50 open:items-center open:justify-center"
      onClose={handleDialogClose}
      onClick={handleBackdropClick}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
      ref={dialogRef}
    >
      <div className="relative flex h-dvh w-dvw flex-col overflow-hidden bg-fd-background">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-fd-border px-4 py-2">
          <span className="font-medium text-fd-muted-foreground text-sm">
            Diagram viewer
          </span>
          <div className="flex items-center gap-2">
            <span className="text-fd-muted-foreground text-xs tabular-nums">
              {Math.round(scale * 100)}%
            </span>
            <button
              className="rounded-md bg-fd-secondary px-2 py-1 text-fd-muted-foreground text-xs transition-colors hover:bg-fd-accent hover:text-fd-foreground"
              onClick={resetView}
              type="button"
            >
              Fit
            </button>
            <button
              className="rounded-md bg-fd-secondary px-2 py-1 text-fd-muted-foreground text-xs transition-colors hover:bg-fd-accent hover:text-fd-foreground"
              onClick={zoomIn}
              type="button"
            >
              Zoom in
            </button>
            <button
              className="rounded-md bg-fd-secondary px-2 py-1 text-fd-muted-foreground text-xs transition-colors hover:bg-fd-accent hover:text-fd-foreground"
              onClick={zoomOut}
              type="button"
            >
              Zoom out
            </button>
            <button
              aria-label="Close diagram viewer"
              className="ml-2 rounded-md bg-fd-secondary p-1 text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-foreground"
              onClick={onClose}
              type="button"
            >
              <svg
                aria-hidden="true"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Viewport */}
        <div
          aria-describedby={viewportHintId}
          aria-label="Diagram canvas"
          className="flex-1 overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-fd-ring focus-visible:ring-inset"
          onKeyDown={handleViewportKeyDown}
          ref={viewportRef}
          role="group"
          tabIndex={0}
        >
          <span className="sr-only" id={viewportHintId}>
            Arrow keys pan, Shift with an arrow pans further, plus and minus
            zoom, and 0 fits the diagram.
          </span>
          <div
            className={[
              "flex h-full w-full cursor-grab items-center justify-center active:cursor-grabbing",
              styles.canvas,
              dragRef.current.active ? styles.dragging : undefined,
              measured ? undefined : styles.unmeasured,
            ]
              .filter(Boolean)
              .join(" ")}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={canvasStyle}
          >
            <MermaidImage alt={alt} expanded svg={svg} />
          </div>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
