import { createI18nMiddleware } from "fumadocs-core/i18n/middleware";
import { isMarkdownPreferred, rewritePath } from "fumadocs-core/negotiation";
import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from "next/server";

import { i18n, isDocsLocale } from "@/lib/i18n";

const { rewrite: rewriteMarkdown } = rewritePath(
  "/docs{/*path}",
  "/llms.mdx/docs{/*path}",
);
const i18nMiddleware = createI18nMiddleware(i18n);
type I18nRequest = Parameters<typeof i18nMiddleware>[0];
type I18nEvent = Parameters<typeof i18nMiddleware>[1];

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

  if (isMarkdownPreferred(request)) {
    const destination = markdownDestination(pathname);
    if (destination) {
      return NextResponse.rewrite(new URL(destination, request.url), {
        headers: { Vary: "Accept" },
      });
    }
  }

  // The monorepo's hoisted install can expose a second Next.js type instance
  // under apps/fumadocs. Both requests are the same runtime Web API object;
  // keep this compatibility cast at the package boundary instead of leaking
  // duplicate-Next nominal types through the app.
  return i18nMiddleware(
    request as unknown as I18nRequest,
    event as unknown as I18nEvent,
  );
}

export const config = {
  matcher: [
    "/",
    "/docs/:path*",
    "/:locale(en|es|fr|de|pt-br|ja|zh-cn|it|ko|hi|ru|ar)",
    "/:locale(en|es|fr|de|pt-br|ja|zh-cn|it|ko|hi|ru|ar)/:path*",
  ],
};
