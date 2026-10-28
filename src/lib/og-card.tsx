import { OG_SIZE, OgCard } from "@ryu/ui/lib/og-card.tsx";
import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/metadata";
import { OG_DOCS_HERO_FRAME } from "@/lib/og-hero-frame.generated";

export { OG_SIZE } from "@ryu/ui/lib/og-card.tsx";

const options = {
  ...OG_SIZE,
  headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
};

/** Docs cards sit on a still of the docs landing hero's ASCII band. */
export const renderOgCard = (): ImageResponse =>
  new ImageResponse(
    <OgCard
      background={OG_DOCS_HERO_FRAME}
      description={siteConfig.description}
      eyebrow="Docs"
    />,
    options,
  );

export const renderDocsOgCard = ({
  title,
  description,
}: {
  title: string;
  description?: string;
}): ImageResponse =>
  new ImageResponse(
    <OgCard
      background={OG_DOCS_HERO_FRAME}
      description={description}
      eyebrow="Docs"
      title={title}
    />,
    options,
  );
