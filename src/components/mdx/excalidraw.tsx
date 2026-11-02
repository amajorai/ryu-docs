"use client";

import { useCallback, useRef, useState } from "react";
import { DiagramLightbox, DiagramTrigger } from "./diagram-lightbox";
import type { DiagramSize } from "./diagram-viewbox";
import {
  diagramDimension,
  type ExcalidrawVariant,
  type ExcalidrawVariantTheme,
  excalidrawFitSize,
  excalidrawVariants,
} from "./excalidraw-variants";

export interface ExcalidrawProps {
  /** Site-relative path to the SVG export, e.g. `/diagrams/flow.excalidraw.svg`. */
  src: string;
  /** Text equivalent of the diagram; it also names the expand button. */
  alt: string;
  /** Optional separate dark-theme export. Without it the light export is inverted. */
  darkSrc?: string;
  caption?: string;
  /**
   * Intrinsic size. Filled from the SVG's `viewBox` at build time for local
   * files (`remarkExcalidrawDimensions`), so authors normally omit them.
   */
  width?: number | string;
  height?: number | string;
}

/**
 * `both` is Excalidraw's own dark theme: invert the light scene, then rotate
 * hues back so colours keep their identity (the editor's dark canvas filter).
 */
const THEME_CLASS: Record<ExcalidrawVariantTheme, string> = {
  both: "dark:[filter:invert(93%)_hue-rotate(180deg)]",
  dark: "hidden dark:block",
  light: "dark:hidden",
};

/**
 * An Excalidraw SVG export. Inline it is a lazy image that follows the page
 * theme; clicking it (or Enter/Space) opens the same pan-and-zoom viewer as
 * Mermaid diagrams. Rendered through `<img>`, so scripts or event handlers in
 * the file never run in the page.
 */
export function Excalidraw({
  alt,
  caption,
  darkSrc,
  height,
  src,
  width,
}: ExcalidrawProps) {
  const [open, setOpen] = useState(false);
  const [fitSize, setFitSize] = useState<DiagramSize>({ width: 0, height: 0 });
  const imagesRef = useRef(new Set<HTMLImageElement>());
  const declared = {
    width: diagramDimension(width),
    height: diagramDimension(height),
  };
  const variants = excalidrawVariants(src, darkSrc);

  const trackImage = useCallback((image: HTMLImageElement | null) => {
    if (image) {
      imagesRef.current.add(image);
    }
  }, []);

  const openViewer = useCallback(() => {
    setFitSize(
      excalidrawFitSize(
        { width: diagramDimension(width), height: diagramDimension(height) },
        loadedNaturalSize(imagesRef.current),
      ),
    );
    setOpen(true);
  }, [width, height]);

  const closeViewer = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <figure className="not-prose my-6">
      <DiagramTrigger label={`Expand diagram: ${alt}`} onOpen={openViewer}>
        <ExcalidrawImages
          alt={alt}
          imageRef={trackImage}
          size={declared}
          variants={variants}
        />
      </DiagramTrigger>
      {caption ? (
        <figcaption className="mt-1 text-center text-fd-muted-foreground text-sm">
          {caption}
        </figcaption>
      ) : null}
      {open ? (
        <DiagramLightbox onClose={closeViewer} size={fitSize}>
          <ExcalidrawImages
            alt={alt}
            expanded
            size={fitSize}
            variants={variants}
          />
        </DiagramLightbox>
      ) : null}
    </figure>
  );
}

/** The light/dark images for one diagram; CSS shows the one for the theme. */
export function ExcalidrawImages({
  alt,
  expanded = false,
  imageRef,
  size,
  variants,
}: {
  alt: string;
  expanded?: boolean;
  imageRef?: (image: HTMLImageElement | null) => void;
  size: DiagramSize;
  variants: ExcalidrawVariant[];
}) {
  const sizeClass = expanded
    ? "pointer-events-none max-w-none"
    : "h-auto max-w-full";
  return variants.map((variant) => (
    // biome-ignore lint/performance/noImgElement: a static SVG export needs no image optimizer, and may be sized only by its own viewBox
    <img
      alt={alt}
      className={`m-0 ${sizeClass} ${THEME_CLASS[variant.theme]}`}
      decoding="async"
      draggable={false}
      height={size.height > 0 ? size.height : undefined}
      key={variant.theme}
      loading={expanded ? "eager" : "lazy"}
      ref={imageRef}
      src={variant.src}
      width={size.width > 0 ? size.width : undefined}
    />
  ));
}

function loadedNaturalSize(images: Set<HTMLImageElement>): DiagramSize | null {
  for (const image of images) {
    if (!image.isConnected) {
      images.delete(image);
      continue;
    }
    if (image.complete && image.naturalWidth > 0 && image.naturalHeight > 0) {
      return { width: image.naturalWidth, height: image.naturalHeight };
    }
  }
  return null;
}
