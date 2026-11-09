import { hiddenProductListings } from "@ryu/auth/lib/product-launch-flags";
import { COMPANY } from "@ryu/blocks/web/data/company.ts";
import {
  FOOTER_COMMUNITY_LINKS,
  FOOTER_DOCS_HOME,
  FOOTER_LEGAL_LINKS,
  FOOTER_START_LINKS,
  FOOTER_TAGLINE,
  type FooterLink,
  footerColumnsFor,
} from "@ryu/blocks/web/footer-links.ts";
import { type DocsLandmarkCopy, docsChromeCopy } from "@/lib/docs-chrome-copy";
import { MAIN_SITE_URL } from "@/lib/layout.shared";

/*
 * The landing footer (packages/blocks/src/web/footer.tsx) for the docs home: the
 * same lead band, link columns and legal row on the landing's full-bleed shell.
 * The links come from the landing's own data (footer-links.ts), so the two
 * footers cannot drift; only the hrefs are resolved for this host. Docs links
 * stay on this site, everything else points at the main site.
 */

/** This host's href for a shared footer link. */
export function docsSiteFooterHref(link: FooterLink): string {
  if (link.kind === "docs") {
    return link.href === FOOTER_DOCS_HOME ? "/docs" : link.href;
  }
  if (link.kind === "external") {
    return link.href;
  }
  return `${MAIN_SITE_URL}${link.href}`;
}

const columnLinkClass =
  "block py-2.5 text-fd-muted-foreground text-sm transition-colors hover:text-fd-foreground md:py-1.5";
const inlineLinkClass =
  "inline-flex min-h-10 items-center text-fd-muted-foreground text-sm transition-colors hover:text-fd-foreground sm:min-h-0";
const pillClass =
  "inline-flex h-10 items-center rounded-full border px-4 font-medium text-sm transition-colors sm:h-9 sm:px-3";

/*
 * The docs are static and read no flags, so they hide what the landing hides
 * under the catalog defaults (as the docs header does): closed standalone
 * service pages, such as Mail, and products not launched yet.
 */
export const DOCS_FOOTER_COLUMNS = footerColumnsFor(
  hiddenProductListings(null),
);

// Static so prerendered pages stay deterministic, as on the landing.
const COPYRIGHT_YEAR = 2026;

function FooterAnchor({
  className,
  link,
}: {
  className: string;
  link: FooterLink;
}) {
  const external = link.kind === "external";
  return (
    <a
      aria-label={link.ariaLabel}
      className={className}
      href={docsSiteFooterHref(link)}
      rel={external ? "noopener noreferrer" : undefined}
      target={external ? "_blank" : undefined}
    >
      {link.label}
    </a>
  );
}

const ENGLISH_LANDMARKS = docsChromeCopy("en").landmarks;

/** `landmarks` names the nav regions in the route's language (English by default). */
export function SiteFooter({
  landmarks = ENGLISH_LANDMARKS,
}: {
  landmarks?: DocsLandmarkCopy;
} = {}) {
  const [primary, ...secondary] = FOOTER_START_LINKS;
  return (
    <footer className="pt-8 pb-16 md:pt-16">
      <div className="w-full px-6 md:px-10 lg:px-16">
        <div className="grid gap-8 border-fd-border border-b pb-10 md:pb-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-16">
          <div className="flex flex-col gap-5">
            <p className="max-w-md text-balance font-heading font-medium text-2xl text-fd-foreground md:text-3xl">
              {FOOTER_TAGLINE}
            </p>
            <nav aria-label={landmarks.community}>
              <ul className="flex flex-wrap items-center gap-x-5 gap-y-1">
                {FOOTER_COMMUNITY_LINKS.map((link) => (
                  <li key={link.href}>
                    <FooterAnchor className={inlineLinkClass} link={link} />
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <nav aria-label={landmarks.getStarted}>
            <ul className="flex flex-wrap items-center gap-2 lg:justify-end">
              {primary ? (
                <li>
                  <FooterAnchor
                    className={`${pillClass} border-transparent bg-fd-foreground text-fd-background hover:bg-fd-foreground/90`}
                    link={primary}
                  />
                </li>
              ) : null}
              {secondary.map((link) => (
                <li key={link.href}>
                  <FooterAnchor
                    className={`${pillClass} border-fd-border text-fd-foreground hover:bg-fd-muted`}
                    link={link}
                  />
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <nav
          aria-label={landmarks.footer}
          className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 md:grid-cols-3 md:gap-x-8 md:py-16 xl:grid-cols-6"
        >
          {DOCS_FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <p className="mb-4 font-medium text-fd-foreground">
                {column.title}
              </p>
              <ul>
                {column.links.map((link) => (
                  <li key={link.href}>
                    <FooterAnchor className={columnLinkClass} link={link} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="flex flex-col gap-4 border-fd-border border-t pt-8 text-fd-muted-foreground text-sm">
          <nav
            aria-label={landmarks.legal}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:gap-x-8"
          >
            {FOOTER_LEGAL_LINKS.map((link) => (
              <FooterAnchor
                className={inlineLinkClass}
                key={link.href}
                link={link}
              />
            ))}
          </nav>
          <p className="text-xs">
            © {COPYRIGHT_YEAR} {COMPANY.legalName}, {COMPANY.country}
          </p>
        </div>
      </div>
    </footer>
  );
}
