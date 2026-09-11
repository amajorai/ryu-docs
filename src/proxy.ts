import { isMarkdownPreferred, rewritePath } from "fumadocs-core/negotiation";
import { type NextRequest, NextResponse } from "next/server";

const { rewrite: rewriteMarkdown } = rewritePath(
  "/docs{/*path}",
  "/llms.mdx/docs{/*path}",
);

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname.endsWith(".md") || pathname.endsWith(".mdx")) {
    return NextResponse.next();
  }

  if (isMarkdownPreferred(request)) {
    const destination = rewriteMarkdown(pathname);
    if (destination) {
      return NextResponse.rewrite(new URL(destination, request.url), {
        headers: { Vary: "Accept" },
      });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/docs/:path*"],
};
