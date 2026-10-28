import { createI18nMiddleware } from "fumadocs-core/i18n/middleware";
import { getNegotiator, rewritePath } from "fumadocs-core/negotiation";
import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from "next/server";

import { DEFAULT_DOCS_LOCALE, i18n, isDocsLocale } from "@/lib/i18n";

const { rewrite: rewriteMarkdown } = rewritePath(
  "/docs{/*path}",
  "/llms.mdx/docs{/*path}",
);
const i18nMiddleware = createI18nMiddleware(i18n);
/** The media types fumadocs-core's `isMarkdownPreferred` answers with Markdown. */
const MARKDOWN_MEDIA_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/x-markdown",
]);

/**
 * Whether the request lists a Markdown media type with a weight above zero.
 *
 * Same decision as fumadocs-core's `isMarkdownPreferred`, except that the type
 * and subtype are compared case-insensitively, as RFC 9110 section 8.3.1
 * requires: the negotiator keeps the client's spelling, so `TEXT/MARKDOWN`
 * used to get HTML here while the main site answered it with Markdown.
 *
 * `mediaType` is annotated because fumadocs-core's declaration imports the
 * untyped `negotiator` package, so `getNegotiator()` is `any` to TypeScript.
 * At runtime `mediaTypes()` returns `type/subtype` strings.
 */
function prefersMarkdown(request: NextRequest): boolean {
  return getNegotiator(request)
    .mediaTypes()
    .some((mediaType: string) =>
      MARKDOWN_MEDIA_TYPES.has(mediaType.toLowerCase()),
    );
}
const DEFAULT_ENGLISH_DOCS_REWRITE = "x-fumadocs-default-english-rewrite";

function markdownDestination(pathname: string): string | undefined {
  const segments = pathname.split("/").filter(Boolean);
  if (isDocsLocale(segments[0]) && segments[1] === "docs") {
    const path = segments.slice(2).join("/");
    return `/llms.mdx/docs/${segments[0]}${path ? `/${path}` : ""}`;
  }

  return rewriteMarkdown(pathname) || undefined;
}

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const pathname = request.nextUrl.pathname;
  if (pathname.endsWith(".md") || pathname.endsWith(".mdx")) {
    return NextResponse.next();
  }

  if (prefersMarkdown(request)) {
    const destination = markdownDestination(pathname);
    if (destination) {
      return NextResponse.rewrite(new URL(destination, request.url), {
        headers: { Vary: "Accept" },
      });
    }
  }

  if (
    pathname.startsWith("/en/docs/") &&
    request.headers.get(DEFAULT_ENGLISH_DOCS_REWRITE) === "1"
  ) {
    const headers = new Headers(request.headers);
    headers.delete(DEFAULT_ENGLISH_DOCS_REWRITE);
    return NextResponse.next({ request: { headers } });
  }

  // Resolve internal default-locale pages instead of redirecting back to the public URL.
  if (
    pathname === `/${DEFAULT_DOCS_LOCALE}` ||
    pathname === `/${DEFAULT_DOCS_LOCALE}/` ||
    pathname === `/${DEFAULT_DOCS_LOCALE}/docs` ||
    pathname.startsWith(`/${DEFAULT_DOCS_LOCALE}/docs/`)
  ) {
    return NextResponse.next();
  }

  // Fumadocs hides the default English locale in browser URLs. Rewriting the
  // default docs route internally avoids a redirect back to the same visible
  // URL while still rendering through the `[lang]` route segment. The marker is
  // consumed on an internal re-entry and removed before the page handler.
  if (pathname === "/docs" || pathname.startsWith("/docs/")) {
    const destination = request.nextUrl.clone();
    destination.pathname = `/en${pathname}`;
    const headers = new Headers(request.headers);
    headers.set(DEFAULT_ENGLISH_DOCS_REWRITE, "1");
    return NextResponse.rewrite(destination, { request: { headers } });
  }

  return i18nMiddleware(request, event);
}

export const config = {
  matcher: [
    "/",
    "/docs/:path*",
    "/:locale(en|es|fr|de|pt-br|ja|zh-cn|it|ko|hi|ru|ar)",
    "/:locale(en|es|fr|de|pt-br|ja|zh-cn|it|ko|hi|ru|ar)/:path*",
  ],
};
