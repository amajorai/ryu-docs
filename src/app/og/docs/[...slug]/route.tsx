import { notFound } from "next/navigation";

import { renderDocsOgCard } from "@/lib/og-card";
import { getPage } from "@/lib/source";

export const revalidate = false;

// OG images are cheap to generate on demand; pre-rendering one for every doc
// page needlessly triples the cold production build.

export async function GET(
  _req: Request,
  { params }: RouteContext<"/og/docs/[...slug]">,
) {
  const { slug } = await params;
  const page = getPage(slug.slice(0, -1));
  if (!page) notFound();

  return renderDocsOgCard({
    title: page.data.title,
    description: page.data.description,
  });
}
