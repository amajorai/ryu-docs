import Link from "fumadocs-core/link";
import type { BaseLayoutProps, LayoutTab } from "fumadocs-ui/layouts/shared";

import { RyuLogo } from "@/components/ryu-logo";
import { i18n } from "@/lib/i18n";

export { translations } from "./fumadocs-translations";

export const MAIN_SITE_URL = "https://ryuhq.com";
export const MAIN_SITE_LABEL = "Main site";

export const MAIN_SITE_TAB = {
  props: {
    "aria-label": "Open the Ryu main site",
  },
  title: MAIN_SITE_LABEL,
  url: MAIN_SITE_URL,
} satisfies LayoutTab;

export const gitConfig = {
  user: "amajorai",
  repo: "ryu",
  branch: "main",
};

export function baseOptions(
  _locale: string = i18n.defaultLanguage,
): BaseLayoutProps {
  return {
    i18n: true,
    nav: {
      // Just the ghost mark — the animated outline logo, no wordmark.
      title: (
        <span className="inline-flex items-center">
          <RyuLogo />
        </span>
      ),
      url: MAIN_SITE_URL,
      children: (
        <Link
          className="text-sm text-fd-muted-foreground transition-colors hover:text-fd-accent-foreground"
          href={MAIN_SITE_URL}
        >
          {MAIN_SITE_LABEL}
        </Link>
      ),
    },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
