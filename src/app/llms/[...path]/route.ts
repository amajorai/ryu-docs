import { notFound } from "next/navigation";

import { buildSectionLlmsIndex } from "@/lib/llms-index";

export const revalidate = false;

const INDEX_SUFFIX = ".txt";
const PAGE_PARAM = /^[1-9]\d{0,3}$/u;

/**
 * `/llms/{folder path}.txt`: the navigation index for one docs folder, linked
 * from the root `/llms.txt`. English only, like the root page tree. A listing
 * too large for one index continues at `?page=N`.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const last = path.at(-1);
  if (!last?.endsWith(INDEX_SUFFIX)) {
    notFound();
  }
  const pageParam = new URL(request.url).searchParams.get("page");
  if (pageParam !== null && !PAGE_PARAM.test(pageParam)) {
    notFound();
  }
  const index = buildSectionLlmsIndex(
    [...path.slice(0, -1), last.slice(0, -INDEX_SUFFIX.length)],
    pageParam === null ? 1 : Number(pageParam),
  );
  if (!index) {
    notFound();
  }

  return new Response(index.text, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
