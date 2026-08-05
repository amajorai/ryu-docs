"use client";

import { useTheme } from "next-themes";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const currentChartRef = useRef<string | null>(null);
  const { resolvedTheme } = useTheme();
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const cacheKey = `${resolvedTheme}:${chart}`;
    if (currentChartRef.current === cacheKey) {
      return;
    }
    currentChartRef.current = cacheKey;

    let cancelled = false;

    const render = async () => {
      const { default: mermaid } = await import("mermaid");
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "loose",
        fontFamily: "inherit",
        theme: resolvedTheme === "dark" ? "dark" : "default",
      });

      const safeId = `mermaid-${id.replace(/[^a-zA-Z0-9]/g, "")}`;
      const { svg: rendered, bindFunctions } = await mermaid.render(
        safeId,
        chart.replaceAll("\\n", "\n"),
      );
      if (cancelled) {
        return;
      }
      setSvg(rendered);
      requestAnimationFrame(() => {
        if (!cancelled && containerRef.current) {
          bindFunctions?.(containerRef.current);
        }
      });
    };

    render().catch(() => {
      if (!cancelled) {
        currentChartRef.current = null;
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

  if (!svg) {
    return (
      <pre className="overflow-x-auto rounded-lg bg-fd-secondary/50 p-4 text-sm">
        <code>{chart}</code>
      </pre>
    );
  }

  return (
    <>
      <div
        className="group/my-4 relative flex cursor-pointer justify-center [&_svg]:max-w-full"
        onClick={openDialog}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openDialog();
          }
        }}
        ref={containerRef}
        role="button"
        tabIndex={0}
        title="Click to expand diagram"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: mermaid output is trusted, build-time authored diagram source
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <span className="block text-center text-fd-muted-foreground text-xs opacity-0 transition-opacity group-hover/my-4:opacity-100">
        Click to expand
      </span>
      {dialogOpen ? (
        <MermaidDialog onClose={closeDialog} svg={svg} />
      ) : null}
    </>
  );
}

const ZOOM_MIN = 0.05;
const ZOOM_MAX = Number.POSITIVE_INFINITY;
/** Upper bound for the automatic fit, so tiny diagrams don't fill the screen. */
const FIT_MAX = 4;
/** Breathing room, in px, kept between the diagram and the viewport edges. */
const FIT_PADDING = 48;

type SvgContent = { html: string; width: number; height: number };

const VIEWBOX_RE = /viewBox="([^"]+)"/;

/**
 * Mermaid emits `width="100%"` plus an inline `max-width`, which makes the
 * rendered size depend on whatever box it lands in — useless for computing a
 * fit. Prepend the intrinsic viewBox size so the dialog can measure it.
 *
 * Done by string prepend rather than DOM parsing: with `htmlLabels` on, mermaid
 * puts HTML inside `<foreignObject>`, which is not well-formed XML, so
 * `DOMParser` in svg mode would fail on exactly the most common diagrams. The
 * injected attributes win because an HTML parser keeps the first of a duplicate
 * pair and ignores the later one.
 */
function prepareSvg(svg: string): SvgContent {
  const parts = svg.match(VIEWBOX_RE)?.[1].split(/[\s,]+/).map(Number) ?? [];
  const valid = parts.length === 4 && parts.every(Number.isFinite);
  const width = valid ? (parts[2] ?? 0) : 0;
  const height = valid ? (parts[3] ?? 0) : 0;
  const sized =
    width > 0 && height > 0 ? ` width="${width}" height="${height}"` : "";
  return {
    html: svg.replace(
      /<svg/,
      `<svg${sized} style="max-width:none;max-height:none"`,
    ),
    width,
    height,
  };
}

function MermaidDialog({
  onClose,
  svg,
}: {
  onClose: () => void;
  svg: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
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

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale((prev) => Math.min(ZOOM_MAX, Math.max(zoomMin, prev * delta)));
    },
    [zoomMin],
  );

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
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
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

  return createPortal(
    <dialog
      aria-label="Expanded diagram view"
      className="backdrop:bg-fd-background/80 m-0 h-dvh max-h-none w-dvw max-w-none border-0 bg-transparent p-0 shadow-2xl backdrop:backdrop-blur-sm open:flex open:fixed open:inset-0 open:z-50 open:items-center open:justify-center"
      onClose={handleDialogClose}
      onClick={handleBackdropClick}
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
              onClick={() => setScale((s) => Math.min(ZOOM_MAX, s * 1.25))}
              type="button"
            >
              Zoom in
            </button>
            <button
              className="rounded-md bg-fd-secondary px-2 py-1 text-fd-muted-foreground text-xs transition-colors hover:bg-fd-accent hover:text-fd-foreground"
              onClick={() => setScale((s) => Math.max(zoomMin, s * 0.8))}
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
          className="flex-1 overflow-hidden"
          onWheel={handleWheel}
          ref={viewportRef}
        >
          <div
            className="flex h-full w-full cursor-grab items-center justify-center active:cursor-grabbing"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: "center center",
              transition: dragRef.current.active
                ? "none"
                : "transform 0.1s ease-out",
              // Avoid a one-frame flash of the un-fitted diagram.
              visibility: measured ? "visible" : "hidden",
            }}
          >
            <div
              className="[&_svg]:pointer-events-none [&_svg]:max-w-none"
              dangerouslySetInnerHTML={{ __html: content.html }}
            />
          </div>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
