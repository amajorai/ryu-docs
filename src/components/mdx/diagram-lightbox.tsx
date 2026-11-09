"use client";

import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import styles from "./diagram-lightbox.module.css";
import {
  type PointerPoint,
  pinchDistance,
  pinchZoomFactor,
} from "./diagram-pinch";
import type { DiagramSize } from "./diagram-viewbox";
import { installMermaidWheelZoom } from "./mermaid-wheel";

type DiagramTransform = CSSProperties & {
  "--diagram-x": string;
  "--diagram-y": string;
  "--diagram-scale": number;
};

const ZOOM_MIN = 0.05;
const ZOOM_MAX = Number.POSITIVE_INFINITY;
/** Keyboard pan distance in CSS pixels; Shift uses the larger step. */
const PAN_STEP = 40;
const PAN_STEP_LARGE = 160;
/** Upper bound for the automatic fit, so tiny diagrams don't fill the screen. */
const FIT_MAX = 4;
/** Breathing room, in px, kept between the diagram and the viewport edges. */
const FIT_PADDING = 48;

const TOOLBAR_BUTTON =
  "rounded-md bg-fd-secondary px-2 py-1 text-fd-muted-foreground text-xs transition-colors hover:bg-fd-accent hover:text-fd-foreground";

/**
 * Inline, clickable diagram shared by `<Mermaid>` and `<Excalidraw>`. A
 * button's name comes from its `aria-label`, not from the image inside it, so
 * `label` must carry the diagram's text equivalent too.
 */
export function DiagramTrigger({
  children,
  label,
  onOpen,
}: {
  children: ReactNode;
  label: string;
  onOpen: () => void;
}) {
  return (
    <>
      <button
        aria-label={label}
        className="peer relative flex w-full cursor-pointer justify-center border-0 bg-transparent p-0"
        onClick={onOpen}
        type="button"
      >
        {children}
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
 * Fullscreen diagram viewer: drag or arrow keys pan; the wheel, a trackpad or
 * touch pinch, +/- and the toolbar zoom; Fit (or 0) restores the fitted view.
 * Escape, the close button or a backdrop click closes it, and focus returns to
 * whatever opened it. `size` is the diagram's intrinsic size, used to fit it to
 * the viewport; an unknown (0) size opens at 100%.
 */
export function DiagramLightbox({
  children,
  onClose,
  size,
}: {
  children: ReactNode;
  onClose: () => void;
  size: DiagramSize;
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
  const pointersRef = useRef(new Map<number, PointerPoint>());
  const pinchRef = useRef<number | null>(null);
  const closingRef = useRef(false);

  const computeFit = useCallback(() => {
    const viewport = viewportRef.current;
    if (!(viewport && size.width > 0 && size.height > 0)) {
      return null;
    }
    const rect = viewport.getBoundingClientRect();
    const fit = Math.min(
      (rect.width - FIT_PADDING) / size.width,
      (rect.height - FIT_PADDING) / size.height,
    );
    return Math.min(FIT_MAX, Math.max(ZOOM_MIN, fit));
  }, [size.width, size.height]);

  // Remember the opener before showModal() moves focus, and give focus back
  // however the viewer closes: an unmounted dialog does not restore it. This
  // cleanup runs while the dialog is still in the page, and an open modal makes
  // the rest of the page inert, so close it first or focus() is ignored.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    return () => {
      if (dialog?.open) {
        // Our own close, not the reader's: see handleDialogClose.
        closingRef.current = true;
        dialog.close();
        closingRef.current = false;
      }
      if (opener?.isConnected) {
        opener.focus({ preventScroll: true });
      }
    };
  }, []);

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

  const zoomBy = useCallback(
    (factor: number) => {
      setScale((prev) => Math.min(ZOOM_MAX, Math.max(zoomMin, prev * factor)));
    },
    [zoomMin],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    return installMermaidWheelZoom(viewport, zoomBy);
  }, [zoomBy]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (e.target instanceof Element) {
        e.target.setPointerCapture(e.pointerId);
      }
      // A second finger turns the drag into a pinch.
      const distance = pinchDistance(pointersRef.current);
      if (distance !== null) {
        dragRef.current.active = false;
        pinchRef.current = distance;
        return;
      }
      dragRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        startOffsetX: offset.x,
        startOffsetY: offset.y,
      };
    },
    [offset],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const pointers = pointersRef.current;
      if (pointers.has(e.pointerId)) {
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }
      if (pinchRef.current !== null) {
        const distance = pinchDistance(pointers);
        if (distance !== null) {
          zoomBy(pinchZoomFactor(pinchRef.current, distance));
          pinchRef.current = distance;
        }
        return;
      }
      if (!dragRef.current.active) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setOffset({
        x: dragRef.current.startOffsetX + dx,
        y: dragRef.current.startOffsetY + dy,
      });
    },
    [zoomBy],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) {
      pinchRef.current = null;
    }
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

  // React StrictMode replays the effects above on mount (close, then
  // showModal). The `close` event from that replay is not the reader closing
  // the viewer: ignore it whether it fires during close() or is queued and
  // lands after the dialog was shown again (as browsers do).
  const handleDialogClose = useCallback(
    (event: React.SyntheticEvent<HTMLDialogElement>) => {
      if (!(closingRef.current || event.currentTarget.open)) {
        onClose();
      }
    },
    [onClose],
  );

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === dialogRef.current) {
        onClose();
      }
    },
    [onClose],
  );

  const canvasStyle: DiagramTransform = {
    "--diagram-x": `${offset.x}px`,
    "--diagram-y": `${offset.y}px`,
    "--diagram-scale": scale,
  };

  return createPortal(
    <dialog
      aria-label="Expanded diagram view"
      className="backdrop:bg-fd-background/80 m-0 h-dvh max-h-none w-dvw max-w-none border-0 bg-transparent p-0 shadow-2xl backdrop:backdrop-blur-sm open:flex open:fixed open:inset-0 open:z-50 open:items-center open:justify-center"
      onClick={handleBackdropClick}
      onClose={handleDialogClose}
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
              className={TOOLBAR_BUTTON}
              onClick={resetView}
              type="button"
            >
              Fit
            </button>
            <button className={TOOLBAR_BUTTON} onClick={zoomIn} type="button">
              Zoom in
            </button>
            <button className={TOOLBAR_BUTTON} onClick={zoomOut} type="button">
              Zoom out
            </button>
            <button
              aria-label="Close diagram viewer"
              className="ms-2 rounded-md bg-fd-secondary p-1 text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-foreground"
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

        {/* Viewport: focusable so the keyboard can pan and zoom (WCAG 2.1.1).
            A fieldset would group form controls; this is a pan surface. */}
        {/* biome-ignore lint/a11y/useSemanticElements: a pan surface, not a form group */}
        <div
          aria-describedby={viewportHintId}
          aria-label="Diagram canvas"
          className="flex-1 overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-fd-ring focus-visible:ring-inset"
          onKeyDown={handleViewportKeyDown}
          ref={viewportRef}
          role="group"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: arrow keys pan the focused canvas
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
            onPointerCancel={handlePointerUp}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={canvasStyle}
          >
            {children}
          </div>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
