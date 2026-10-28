"use client";

import dynamic from "next/dynamic";

/*
 * The OpenAPI renderer is large and only API-reference pages render it. A
 * static import would ship it to every docs page (they share one route), so
 * load it as its own chunk; server rendering is unchanged.
 */
export const OpenAPIPage = dynamic(() =>
  import("./api-page.renderer").then((mod) => mod.OpenAPIPage),
);
