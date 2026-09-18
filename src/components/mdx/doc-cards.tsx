import { getPageTreePeers } from "fumadocs-core/page-tree";
import { Cards } from "fumadocs-ui/components/card";
import type { ReactNode } from "react";

import { LocalizedCard } from "@/components/localized-card";
import { LevelBadge } from "@/components/mdx/level-badge";
import { localizeDocsHref, versionedDocsHref } from "@/lib/docs-version";
import { DEFAULT_DOCS_LOCALE } from "@/lib/i18n";
import { getPageByHref, source } from "@/lib/source";

function lookup(href: string, locale: string) {
  return getPageByHref(href, locale)?.page;
}

/**
 * A documentation card that auto-pulls the linked page's title and description
 * from the page source, so a link reads like a rich preview instead of a bare
 * button. Pass `title`/`description` to override the looked-up values.
 */
export function DocCard({
  href,
  title,
  description,
  locale = DEFAULT_DOCS_LOCALE,
}: {
  href: string;
  title?: ReactNode;
  description?: ReactNode;
  locale?: string;
}) {
  const target = versionedDocsHref(href);
  const page = lookup(target, locale);
  const level = page?.data.level;
  const cardTitle = title ?? page?.data.title ?? target;

  return (
    <LocalizedCard
      href={target}
      title={
        level === undefined ? (
          cardTitle
        ) : (
          <span className="inline-flex flex-wrap items-center gap-2">
            {cardTitle}
            <LevelBadge level={level} />
          </span>
        )
      }
    >
      {description ?? page?.data.description}
    </LocalizedCard>
  );
}

/**
 * Renders a Cards grid of every child page of the given index `url`, each card
 * showing that page's title and description, in page-tree order. Use this on a
 * folder index page to list its children with descriptions automatically.
 */
export function AutoCards({
  url,
  locale = DEFAULT_DOCS_LOCALE,
}: {
  url: string;
  locale?: string;
}) {
  const peers = getPageTreePeers(
    source.getPageTree(locale),
    localizeDocsHref(versionedDocsHref(url), locale) ?? url,
  );

  return (
    <Cards>
      {peers.map((peer) => (
        <DocCard
          href={peer.url}
          key={peer.url}
          locale={locale}
          title={peer.name}
        />
      ))}
    </Cards>
  );
}
