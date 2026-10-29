"use client";

import { PageAiActionIcon } from "@ryu/blocks/web/page-ai-action-icons.tsx";
import { pageAiActions } from "@ryu/blocks/web/page-ai-actions.ts";
import { buttonVariants } from "fumadocs-ui/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "fumadocs-ui/components/ui/popover";
import { ChevronDown, ExternalLinkIcon, TextIcon } from "lucide-react";
import type { ReactNode } from "react";

import { RyuLogo } from "@/components/ryu-logo";
import { cn } from "@/lib/cn";

export interface PageActionLabels {
  open: string;
  openInGitHub: string;
  viewAsMarkdown: string;
}

interface PageActionItem {
  key: string;
  title: string;
  href: string;
  icon: ReactNode;
  newTab: boolean;
}

function GitHubMark() {
  return (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

/**
 * The docs page "Open" menu. Fumadocs' own ViewOptionsPopover hardcodes its
 * entries, so this keeps its look and items and puts "Open in Ryu" first. The
 * assistant entries come from `@ryu/blocks/web/page-ai-actions`, which the
 * landing site's content pages use too.
 */
export function DocsPageOpenMenu({
  githubUrl,
  labels,
  markdownUrl,
  pageUrl,
}: {
  githubUrl: string;
  labels: PageActionLabels;
  markdownUrl: string;
  /** The page's absolute URL, which the assistants are asked to read. */
  pageUrl: string;
}) {
  const items: PageActionItem[] = [
    ...pageAiActions(pageUrl).map((action) => ({
      key: action.id,
      title: action.title,
      href: action.href,
      newTab: action.newTab,
      icon: (
        <PageAiActionIcon id={action.id} ryuIcon={<RyuLogo size={16} />} />
      ),
    })),
    {
      key: "github",
      title: labels.openInGitHub,
      href: githubUrl,
      newTab: true,
      icon: <GitHubMark />,
    },
    {
      key: "markdown",
      title: labels.viewAsMarkdown,
      href: markdownUrl,
      newTab: true,
      icon: <TextIcon aria-hidden="true" />,
    },
  ];

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          buttonVariants({ color: "secondary", size: "sm" }),
          "gap-2 data-[state=open]:bg-fd-accent data-[state=open]:text-fd-accent-foreground",
        )}
      >
        {labels.open}
        <ChevronDown
          aria-hidden="true"
          className="size-3.5 text-fd-muted-foreground"
        />
      </PopoverTrigger>
      <PopoverContent className="flex flex-col">
        {items.map((item) => (
          <a
            className="inline-flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-fd-accent hover:text-fd-accent-foreground [&_svg]:size-4"
            href={item.href}
            key={item.key}
            rel={item.newTab ? "noreferrer noopener" : undefined}
            target={item.newTab ? "_blank" : undefined}
          >
            {item.icon}
            {item.title}
            {item.newTab ? (
              <ExternalLinkIcon
                aria-hidden="true"
                className="ms-auto size-3.5 text-fd-muted-foreground"
              />
            ) : null}
          </a>
        ))}
      </PopoverContent>
    </Popover>
  );
}
