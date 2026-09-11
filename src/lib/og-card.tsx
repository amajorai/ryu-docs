import { OG_SIZE, OgCard } from "@ryu/ui/lib/og-card.tsx";
import { ImageResponse } from "next/og";

export { OG_SIZE } from "@ryu/ui/lib/og-card.tsx";

const options = {
  ...OG_SIZE,
  headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
};

export const renderOgCard = (): ImageResponse =>
  new ImageResponse(<OgCard />, options);

export const renderDocsOgCard = ({ title }: { title: string }): ImageResponse =>
  new ImageResponse(<OgCard title={title} eyebrow="Docs" />, options);
