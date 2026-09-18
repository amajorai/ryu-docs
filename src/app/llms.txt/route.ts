import { llms } from "fumadocs-core/source";

import { localeFromInput } from "@/lib/i18n";
import { source } from "@/lib/source";

export const revalidate = false;

export function GET(request: Request) {
  const locale = localeFromInput(
    new URL(request.url).searchParams.get("locale"),
  );
  if (!locale) {
    return new Response("Unsupported documentation locale", { status: 400 });
  }

  return new Response(llms(source).index(locale), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
