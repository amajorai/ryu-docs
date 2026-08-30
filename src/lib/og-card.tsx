import { prismBackgroundDataUri } from "@ryu/ui/lib/og-prism.ts";
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 } as const;

const WHITE = "#ffffff";

const GHOST_PATH =
  "M12,24c9.2,0,12.9-4.8,12.4-14.6C24.1,0.3,12.8-3.7,8.8,5.4c-2.2,5.7,1.1,7.9-2.9,12.6c-0.9,1.1-1.8,2-2.7,3.1c-1.2,1.3,0.7,2.2,1.9,2.2C7.4,23.3,9.7,24,12,24z";
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 28 28"><path d="${GHOST_PATH}" fill="none" stroke="${WHITE}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="15" cy="10" rx="1.5" ry="3" fill="${WHITE}"/><ellipse cx="19" cy="10" rx="1.5" ry="3" fill="${WHITE}"/></svg>`;
const LOGO_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(LOGO_SVG)}`;

const OgCard = () => (
  <div
    style={{
      width: "100%",
      height: "100%",
      display: "flex",
      position: "relative",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#ffffff",
      fontFamily: "Inter",
    }}
  >
    {/* biome-ignore lint/performance/noImgElement: ImageResponse renders this to an image. */}
    <img
      alt=""
      height={OG_SIZE.height}
      src={prismBackgroundDataUri("ryu")}
      style={{ position: "absolute", left: 0, top: 0 }}
      width={OG_SIZE.width}
    />
    <div style={{ display: "flex", alignItems: "center", gap: "30px" }}>
      {/* biome-ignore lint/performance/noImgElement: ImageResponse renders this to an image. */}
      <img alt="" height={136} src={LOGO_DATA_URI} width={136} />
      <span
        style={{
          fontSize: "112px",
          fontWeight: 500,
          lineHeight: 1,
          letterSpacing: "-4px",
          color: WHITE,
        }}
      >
        Ryu
      </span>
    </div>
  </div>
);

export const renderOgCard = (): ImageResponse =>
  new ImageResponse(<OgCard />, {
    ...OG_SIZE,
    headers: {
      "Cache-Control": "public, immutable, max-age=31536000",
    },
  });

type DocsOgCardProps = {
  title: string;
  description?: string;
};

const DocsOgCard = ({ title, description }: DocsOgCardProps) => (
  <div
    style={{
      width: "100%",
      height: "100%",
      display: "flex",
      position: "relative",
      flexDirection: "column",
      justifyContent: "space-between",
      padding: "64px 72px",
      backgroundColor: "#ffffff",
      fontFamily: "Inter",
    }}
  >
    {/* biome-ignore lint/performance/noImgElement: ImageResponse renders this to an image. */}
    <img
      alt=""
      height={OG_SIZE.height}
      src={prismBackgroundDataUri("ryu")}
      style={{ position: "absolute", left: 0, top: 0 }}
      width={OG_SIZE.width}
    />
    <div
      style={{
        display: "flex",
        position: "relative",
        alignItems: "center",
        gap: "16px",
      }}
    >
      {/* biome-ignore lint/performance/noImgElement: ImageResponse renders this to an image. */}
      <img alt="" height={56} src={LOGO_DATA_URI} width={56} />
      <span style={{ fontSize: "30px", fontWeight: 600, color: WHITE }}>
        Ryu Docs
      </span>
    </div>
    <div
      style={{
        display: "flex",
        position: "relative",
        flexDirection: "column",
        gap: "18px",
        maxWidth: "1020px",
      }}
    >
      <span
        style={{
          fontSize: "64px",
          fontWeight: 600,
          lineHeight: 1.05,
          color: WHITE,
        }}
      >
        {title}
      </span>
      {description ? (
        <span
          style={{
            fontSize: "26px",
            lineHeight: 1.25,
            color: "rgba(255, 255, 255, 0.78)",
          }}
        >
          {description.slice(0, 180)}
        </span>
      ) : null}
    </div>
  </div>
);

export const renderDocsOgCard = ({
  title,
  description,
}: DocsOgCardProps): ImageResponse =>
  new ImageResponse(<DocsOgCard title={title} description={description} />, {
    ...OG_SIZE,
    headers: {
      "Cache-Control": "public, immutable, max-age=31536000",
    },
  });
