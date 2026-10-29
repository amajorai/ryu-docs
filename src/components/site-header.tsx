"use client";

import { hiddenProductListings } from "@ryu/auth/lib/product-launch-flags";
import { DownloadMenu } from "@ryu/blocks/web/download-menu.tsx";
import {
  HeaderLinkOrigin,
  ProductsMenu,
  ResourcesMenu,
} from "@ryu/blocks/web/header-catalog-menus.tsx";
import { badgeVariants } from "@ryu/ui/components/badge";
import { buttonVariants } from "@ryu/ui/components/button";
import {
  MotionNavigationMenu,
  MotionNavigationMenuItem,
  MotionNavigationMenuList,
} from "@ryu/ui/components/motion-navigation-menu";
import { cn } from "@ryu/ui/lib/utils";
import { LanguageSelect } from "fumadocs-ui/layouts/shared/slots/language-select";
import {
  FullSearchTrigger,
  SearchTrigger,
} from "fumadocs-ui/layouts/shared/slots/search-trigger";
import { ThemeSwitch } from "fumadocs-ui/layouts/shared/slots/theme-switch";
import { LanguagesIcon } from "lucide-react";
import { usePathname } from "next/navigation";

import { LocalizedLink } from "@/components/localized-link";
import { RyuLogo } from "@/components/ryu-logo";
import { DOCS_ENTRY_PATH, isDocsPathname } from "@/lib/docs-version";
import { gitConfig, MAIN_SITE_URL } from "@/lib/layout.shared";

/*
 * The docs wear the landing header (packages/blocks/src/web/header.tsx) so moving
 * between ryuhq.com and the docs never changes the chrome: the 28px outline ghost
 * with a secondary badge on the left, the centered ghost-button nav, and the
 * mono download split button and sign-in on the right, over the same blurred
 * background scrim. The docs-only controls (search, theme, language, GitHub)
 * sit before them.
 */

interface SiteNavLink {
  label: string;
  href: string;
}

export const SITE_NAV_LINKS: readonly SiteNavLink[] = [
  { label: "Enterprise", href: `${MAIN_SITE_URL}/enterprise` },
];

export const SITE_SIGN_IN_URL = `${MAIN_SITE_URL}/login`;

/*
 * Products the landing's menus leave out under the catalog defaults (closed
 * standalone services and unlaunched products). The docs build cannot read the
 * live rollout flags, so a product an admin opens appears here on the next
 * docs deploy.
 */
const DOCS_HIDDEN_PRODUCT_IDS = hiddenProductListings(null);

const NAV_LINK_CLASS = cn(
  buttonVariants({ size: "sm", variant: "ghost" }),
  "text-foreground hover:bg-muted hover:text-foreground",
);

const ICON_BUTTON_CLASS = cn(
  buttonVariants({ size: "icon-sm", variant: "ghost" }),
  "text-muted-foreground hover:text-foreground",
);

function GitHubIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.83 1.24 1.83 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.62-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .32.21.69.82.57A12 12 0 0 0 12 .3" />
    </svg>
  );
}

export function SiteHeader({
  className,
  mobileSearch = true,
  transparent = false,
}: {
  className?: string;
  /** Docs pages keep search in the Glass bottom bar on phones. */
  mobileSearch?: boolean;
  /** Let the home hero's backdrop continue behind the header, as on the landing. */
  transparent?: boolean;
}) {
  const inDocs = isDocsPathname(usePathname());
  return (
    <header
      className={cn("sticky top-0 z-40 h-(--site-header-height)", className)}
      data-site-header=""
    >
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 backdrop-blur-xl [mask-image:linear-gradient(to_bottom,black_65%,transparent)]",
          transparent ? "bg-background/30" : "bg-background/80",
        )}
      />
      <div className="relative z-10 flex h-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          {/* The ghost is the Ryu brand, so it goes to the main site; the
              Docs badge beside it is this site's home. */}
          <a
            aria-label="Ryu home"
            className="-m-1.5 flex min-h-10 shrink-0 items-center p-1.5 text-foreground"
            href={MAIN_SITE_URL}
          >
            <RyuLogo size={28} />
          </a>
          <LocalizedLink
            className={cn(
              badgeVariants({ variant: "secondary" }),
              "shrink-0 rounded-bl-lg",
            )}
            href="/"
          >
            Docs
          </LocalizedLink>
        </div>

        <nav
          aria-label="Ryu"
          className="hidden shrink-0 items-center font-medium lg:flex"
        >
          {/* The landing's own Products and Resources menus, linking back to
              ryuhq.com (HeaderLinkOrigin). */}
          <HeaderLinkOrigin value={MAIN_SITE_URL}>
            <MotionNavigationMenu
              viewportAppearance="marketing"
              viewportClassName="dark:bg-[oklch(0.17_0_0)]"
            >
              <MotionNavigationMenuList>
                <MotionNavigationMenuItem value="products">
                  <ProductsMenu
                    hiddenProductIds={DOCS_HIDDEN_PRODUCT_IDS}
                    pathname=""
                  />
                </MotionNavigationMenuItem>
                <MotionNavigationMenuItem value="resources">
                  <ResourcesMenu pathname="" />
                </MotionNavigationMenuItem>
              </MotionNavigationMenuList>
            </MotionNavigationMenu>
          </HeaderLinkOrigin>
          {SITE_NAV_LINKS.map((link) => (
            <a className={NAV_LINK_CLASS} href={link.href} key={link.href}>
              {link.label}
            </a>
          ))}
          <LocalizedLink
            aria-current={inDocs ? "page" : undefined}
            className={cn(NAV_LINK_CLASS, "bg-muted")}
            href={DOCS_ENTRY_PATH}
          >
            Docs
          </LocalizedLink>
        </nav>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
          <FullSearchTrigger
            className="hidden h-8 w-48 rounded-full border border-border bg-background ps-3 text-muted-foreground text-sm transition-colors hover:bg-muted xl:inline-flex"
            hideIfDisabled
          />
          <SearchTrigger
            className={cn(
              ICON_BUTTON_CLASS,
              "xl:hidden",
              !mobileSearch && "max-md:hidden",
            )}
            hideIfDisabled
          />
          <LanguageSelect className={cn(ICON_BUTTON_CLASS, "max-md:hidden")}>
            <LanguagesIcon aria-hidden="true" className="size-4" />
          </LanguageSelect>
          <a
            aria-label="Ryu on GitHub"
            className={cn(ICON_BUTTON_CLASS, "max-md:hidden [&_svg]:size-4")}
            href={`https://github.com/${gitConfig.user}/${gitConfig.repo}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            <GitHubIcon />
          </a>
          <ThemeSwitch className="rounded-full max-md:hidden" />
          {/* The landing's split download button and sign-in, styled as on
              ryuhq.com (apps/web/src/components/site-header-client.tsx). */}
          <div className="ms-1.5 flex items-center gap-2 [&>button]:rounded-full">
            <DownloadMenu
              className="hidden sm:inline-flex"
              contentAlign="end"
              showSeparator={false}
              siteOrigin={MAIN_SITE_URL}
              size="sm"
              variant="mono"
            />
            <a
              className={buttonVariants({ size: "sm", variant: "ghost" })}
              href={SITE_SIGN_IN_URL}
            >
              Sign in
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
