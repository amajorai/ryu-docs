import type { Metadata } from "next";

export const siteConfig = {
  name: "Ryu Docs",
  description:
    "The composable integration layer for AI. Build and run AI agents without starting from scratch. Extend capability with plugins, or turn agents into apps.",
  keywords: [
    "Ryu",
    "AI agents",
    "AI agent infrastructure",
    "AI agent gateway",
    "MCP",
    "agent tools",
    "AI agent SDK",
  ],
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://docs.ryuhq.com",
};

export function generateMetadata(): Metadata {
  const image = "/opengraph-image";

  return {
    title: {
      default: siteConfig.name,
      template: `%s | ${siteConfig.name}`,
    },
    description: siteConfig.description,
    metadataBase: new URL(siteConfig.url),
    applicationName: "Ryu",
    authors: [{ name: "Ryu" }],
    creator: "Ryu",
    publisher: "Ryu",
    keywords: siteConfig.keywords,
    alternates: {
      canonical: "/",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    appleWebApp: {
      title: "Ryu",
    },
    openGraph: {
      title: siteConfig.name,
      description: siteConfig.description,
      url: "/",
      siteName: siteConfig.name,
      locale: "en_US",
      type: "website",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: `${siteConfig.name}: ${siteConfig.description}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: siteConfig.name,
      description: siteConfig.description,
      images: [
        {
          url: image,
          alt: `${siteConfig.name}: ${siteConfig.description}`,
        },
      ],
    },
  };
}
