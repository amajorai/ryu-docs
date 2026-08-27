import { ImageResponse } from "@takumi-rs/image-response";
import { generate as DefaultImage } from "fumadocs-ui/og/takumi";
import { notFound } from "next/navigation";

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

  return new ImageResponse(
    <DefaultImage
      title={page.data.title}
      description={page.data.description}
      site="Ryu Docs"
    />,
    {
      width: 1200,
      height: 630,
      format: "webp",
    },
  );
}
