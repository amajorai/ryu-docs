import type { ReactNode } from "react";

/*
 * A locale route (/ar, /ja, ...) serves the English source when a page has no
 * translation yet, while <html> carries the route's language and direction.
 * This region re-tags that English prose as lang="en" dir="ltr", so Arabic
 * routes do not lay English out right to left and screen readers do not read
 * it with the route's voice. The localized chrome around it (page actions,
 * feedback, TOC, sidebar) stays outside the region, in the route's language.
 *
 * "contents" keeps the wrapped nodes on their parent's layout; lang and dir
 * still inherit through it.
 */
export function EnglishFallbackRegion({
  children,
  fallback,
}: {
  children: ReactNode;
  /** True when the route shows the English source in place of a translation. */
  fallback: boolean;
}) {
  if (!fallback) return children;
  return (
    <div className="contents" data-english-fallback="" dir="ltr" lang="en">
      {children}
    </div>
  );
}
