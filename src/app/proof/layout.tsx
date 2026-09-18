import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";

import { DocsLayoutClient } from "../[lang]/docs/docs-layout.client";
import { fumadocsProvider } from "@/lib/fumadocs-translations";
import { baseOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";

import "../global.css";

export default function ProofLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <RootProvider dir="ltr" i18n={fumadocsProvider("en")}>
          <DocsLayoutClient
            tree={source.getPageTree("en")}
            {...baseOptions("en")}
          >
            {children}
          </DocsLayoutClient>
        </RootProvider>
      </body>
    </html>
  );
}
