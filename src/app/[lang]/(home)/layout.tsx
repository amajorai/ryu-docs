import { HomeLayout } from "fumadocs-ui/layouts/home";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { baseOptions } from "@/lib/layout.shared";

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const options = baseOptions(lang);
  // The Fumadocs navbar gives way to the landing-matched header and footer.
  return (
    <HomeLayout {...options} nav={{ ...options.nav, enabled: false }}>
      <SiteHeader transparent />
      {children}
      <SiteFooter />
    </HomeLayout>
  );
}
