import type { Metadata } from "next";

import {
  DEFAULT_DOCS_LOCALE,
  DOCS_LANGUAGES,
  localizedPath,
  openGraphLocale,
} from "@/lib/i18n";

export const siteConfig = {
  name: "Ryu Docs",
  description:
    "Technical documentation for Ryu, an AI agent deployment platform for startups. Deploy, govern, and extend autonomous agents with Core, Gateway, tools, and SDKs.",
  keywords: [
    "Ryu",
    "AI agent deployment platform",
    "AI agent infrastructure",
    "autonomous AI agents",
    "AI agent hosting",
    "managed AI agents",
    "cloud AI agents",
    "AI agent gateway",
    "MCP",
    "agent tools",
    "AI agent SDK",
    "AI tool integrations",
    "AI agents for startups",
  ],
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://docs.ryuhq.com",
};

export function generateMetadata(
  locale: string = DEFAULT_DOCS_LOCALE,
): Metadata {
  const image = "/opengraph-image";
  const pageUrl = localizedPath("/", locale);
  const languages = Object.fromEntries(
    DOCS_LANGUAGES.map((language) => [language, localizedPath("/", language)]),
  );

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
    category: "technology",
    formatDetection: {
      address: false,
      email: false,
      telephone: false,
    },
    keywords: siteConfig.keywords,
    alternates: {
      canonical: pageUrl,
      languages,
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
      url: pageUrl,
      siteName: siteConfig.name,
      locale: openGraphLocale(locale),
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
