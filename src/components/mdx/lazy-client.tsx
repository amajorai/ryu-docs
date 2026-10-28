"use client";

import dynamic from "next/dynamic";

/*
 * MDX client components, each split into its own chunk.
 *
 * The docs page is one route, so every client component the server MDX map
 * imports statically ships to every docs page, whether the page renders it or
 * not. These wrappers keep server rendering (the HTML, SEO and layout are
 * unchanged) but only download a component's code on pages that render it.
 */

export const ContributionSurfaces = dynamic(() =>
  import("@/components/mdx/contribution-surfaces").then(
    (mod) => mod.ContributionSurfaces,
  ),
);

export const Mermaid = dynamic(() =>
  import("@/components/mdx/mermaid").then((mod) => mod.Mermaid),
);

export const Quiz = dynamic(() =>
  import("@/components/mdx/quiz").then((mod) => mod.Quiz),
);

export const SurfacePreview = dynamic(() =>
  import("@/components/mdx/surface-preview").then((mod) => mod.SurfacePreview),
);

export const UiComponentPreview = dynamic(() =>
  import("@/components/mdx/ui-component-preview").then(
    (mod) => mod.UiComponentPreview,
  ),
);
