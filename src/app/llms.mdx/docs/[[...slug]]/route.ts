import { notFound } from "next/navigation";

import { getLLMText, getPage } from "@/lib/source";

export const revalidate = false;

// Keep the Markdown projection on demand instead of compiling the full docs
// corpus a second time during every production build.

export async function GET(
  _req: Request,
  { params }: RouteContext<"/llms.mdx/docs/[[...slug]]">,
) {
  const { slug } = await params;
  const page = getPage(slug);
  if (!page) notFound();

  return new Response(await getLLMText(page), {
    headers: {
      "Content-Type": "text/markdown",
    },
  });
}
