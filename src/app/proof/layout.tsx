import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { compactPageTreeForClient } from "@/lib/client-page-tree";
import { fumadocsProvider } from "@/lib/fumadocs-translations";
import { baseOptions } from "@/lib/layout.shared";
import { siteConfig } from "@/lib/metadata";
import { source } from "@/lib/source";
import { DocsLayoutClient } from "../[lang]/docs/docs-layout.client";

import "../global.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  robots: { index: false, follow: false },
};

export default function ProofLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <RootProvider dir="ltr" i18n={fumadocsProvider("en")}>
          <DocsLayoutClient
            tree={compactPageTreeForClient(source.getPageTree("en"))}
            {...baseOptions("en")}
          >
            {children}
          </DocsLayoutClient>
        </RootProvider>
      </body>
    </html>
  );
}
