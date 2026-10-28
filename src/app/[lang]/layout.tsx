import { RyuAssistantWidget } from "@ryu/assistant-widget/docs-assistant";
import "@fontsource-variable/geist";
import "@fontsource-variable/inter";
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

import { HorizontalWheelScroll } from "../horizontal-wheel-scroll";

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
