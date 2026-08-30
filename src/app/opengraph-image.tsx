import { siteConfig } from "@/lib/metadata";
import { renderOgCard } from "@/lib/og-card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = siteConfig.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOgCard();
}
