import { RyuAssistantWidget } from "@ryu/assistant-widget/docs-assistant";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { WebMcpProvider } from "@/components/webmcp-provider";
import { fumadocsProvider } from "@/lib/fumadocs-translations";
import {
  directionForDocsLocale,
  isDocsLocale,
  localeForDocument,
} from "@/lib/i18n";
import { generateMetadata as generateSiteMetadata } from "@/lib/metadata";
import "../global.css";
import { Geist, Inter } from "next/font/google";

import { HorizontalWheelScroll } from "../horizontal-wheel-scroll";

const inter = Inter({
  subsets: ["latin"],
});

// Headings use Geist; body keeps Inter. Both are exposed as CSS variables and
// wired up in global.css (`--font-heading` maps to Geist).
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({
  params,
}: LocaleLayoutProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isDocsLocale(lang)) {
    notFound();
  }
  return generateSiteMetadata(lang);
}

export default async function Layout({ children, params }: LocaleLayoutProps) {
  const { lang } = await params;
  if (!isDocsLocale(lang)) {
    notFound();
  }
  const direction = directionForDocsLocale(lang);

  return (
    <html
      dir={direction}
      lang={localeForDocument(lang)}
      className={`${geist.variable} ${inter.className}`}
      suppressHydrationWarning
    >
      <head>
        <link
          href="/llms.txt"
          rel="alternate"
          title="LLM-friendly docs index"
          type="text/plain"
        />
      </head>
      <body className="flex flex-col min-h-screen">
        <RootProvider dir={direction} i18n={fumadocsProvider(lang)}>
          <HorizontalWheelScroll />
          {children}
          <WebMcpProvider />
          <RyuAssistantWidget />
        </RootProvider>
      </body>
    </html>
  );
}
