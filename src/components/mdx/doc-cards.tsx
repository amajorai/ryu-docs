import { getPageTreePeers } from "fumadocs-core/page-tree";
import { Card, Cards } from "fumadocs-ui/components/card";
import type { ReactNode } from "react";

import { LevelBadge } from "@/components/mdx/level-badge";
import { versionedDocsHref } from "@/lib/docs-version";
import { getPageByHref, source } from "@/lib/source";

function lookup(href: string) {
  return getPageByHref(href)?.page;
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
}: {
  href: string;
  title?: ReactNode;
  description?: ReactNode;
}) {
  const target = versionedDocsHref(href);
  const page = lookup(target);
  const level = page?.data.level;
  const cardTitle = title ?? page?.data.title ?? target;

  return (
    <Card
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
    </Card>
  );
}

/**
 * Renders a Cards grid of every child page of the given index `url`, each card
 * showing that page's title and description, in page-tree order. Use this on a
 * folder index page to list its children with descriptions automatically.
 */
export function AutoCards({ url }: { url: string }) {
  const peers = getPageTreePeers(source.pageTree, versionedDocsHref(url));

  return (
    <Cards>
      {peers.map((peer) => (
        <DocCard href={peer.url} key={peer.url} title={peer.name} />
      ))}
    </Cards>
  );
}
