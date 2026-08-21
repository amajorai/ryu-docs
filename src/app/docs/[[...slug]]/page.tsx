import {
  DocsBody,
  DocsDescription,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from "fumadocs-ui/layouts/docs/page";
import { createRelativeLink } from "fumadocs-ui/mdx";
import { DocsPage } from "fumadocs-ui/page";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { APIPage } from "@/components/api-page";
import { JsonLd } from "@/components/json-ld";
import { getMDXComponents, VersionedAnchor } from "@/components/mdx";
import { LevelBadge } from "@/components/mdx/level-badge";
import {
  archivedDocsUrl,
  docsPath,
  docsPathForVersion,
  isDocsVersionSlug,
  isVersionSegment,
} from "@/lib/docs-version";
import { gitConfig } from "@/lib/layout.shared";
import { siteConfig } from "@/lib/metadata";
import {
  generateDocsParams,
  getPage,
  getPageImage,
  source,
} from "@/lib/source";

export default async function Page(props: PageProps<"/docs/[[...slug]]">) {
  const params = await props.params;
  const slugs = params.slug ?? [];
  if (!isDocsVersionSlug(slugs[0])) {
    // A STALE version segment must be dropped, not carried along. This used to
    // pass `slugs` through whole, so `/docs/0.1.1/start-here` redirected to
    // `/docs/<current>/0.1.1/start-here` — a path with a version segment buried
    // in the middle, which resolves to nothing and 404s. Every deep link
    // published under a previous release died that way at each bump.
    //
    // If that version has an archived deployment, send the reader there: those
    // docs actually describe the release they asked for. Otherwise fall back to
    // the same page on the current version, losing the version but never the
    // reader.
    if (isVersionSegment(slugs[0])) {
      const rest = slugs.slice(1);
      const archived = archivedDocsUrl(slugs[0]);
      permanentRedirect(
        archived
          ? `${archived}${docsPathForVersion(slugs[0], ...rest)}`
          : docsPath(...rest),
      );
    }
    permanentRedirect(docsPath(...slugs));
  }

  const page = getPage(slugs);
  if (!page) notFound();

  const MDX = page.data.body;
  const description =
    page.data.description ?? `${page.data.title} — ${siteConfig.description}`;
  const tags = page.data.tags ?? [];
  const lastModified = page.data.lastModified?.toISOString();
  const pageUrl = new URL(page.url, siteConfig.url).toString();
  const imageUrl = new URL(getPageImage(page).url, siteConfig.url).toString();
  const organizationId = `${siteConfig.url}/#organization`;
  const websiteId = `${siteConfig.url}/#website`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@id": organizationId,
        "@type": "Organization",
        name: "Ryu",
        url: siteConfig.url,
      },
      {
        "@id": websiteId,
        "@type": "WebSite",
        name: siteConfig.name,
        publisher: { "@id": organizationId },
        url: siteConfig.url,
      },
      {
        "@id": `${pageUrl}#article`,
        "@type": "TechArticle",
        author: { "@id": organizationId },
        description,
        headline: page.data.title,
        image: [imageUrl],
        inLanguage: "en-US",
        isPartOf: { "@id": websiteId },
        mainEntityOfPage: pageUrl,
        publisher: { "@id": organizationId },
        ...(lastModified ? { dateModified: lastModified } : {}),
        ...(tags.length > 0 ? { keywords: tags } : {}),
        url: pageUrl,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            item: siteConfig.url,
            name: "Home",
            position: 1,
          },
          {
            "@type": "ListItem",
            item: `${siteConfig.url}/docs`,
            name: "Docs",
            position: 2,
          },
          {
            "@type": "ListItem",
            item: pageUrl,
            name: page.data.title,
            position: 3,
          },
        ],
      },
    ],
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <DocsPage
        toc={page.data.toc}
        full={page.data.full}
        lastUpdate={page.data.lastModified}
      >
        {page.data.level === undefined ? null : (
          <div className="mb-1">
            <LevelBadge level={page.data.level} />
          </div>
        )}
        <DocsTitle>{page.data.title}</DocsTitle>
        <DocsDescription className="mb-0">
          {page.data.description}
        </DocsDescription>
        <div className="flex flex-row gap-2 items-center pb-6">
          <MarkdownCopyButton markdownUrl={`${page.url}.mdx`} />
          <ViewOptionsPopover
            markdownUrl={`${page.url}.mdx`}
            githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/content/docs/${page.path}`}
          />
        </div>
        <DocsBody>
          <MDX
            components={getMDXComponents({
              // this allows you to link to other pages with relative file paths.
              // `source` is cast because fumadocs 16.9 tightened `createRelativeLink`'s
              // generic so the concrete docs-page type (`type: undefined`) no longer
              // unifies with its contravariant `LoaderConfig` parameter.
              a: createRelativeLink(
                source as unknown as Parameters<typeof createRelativeLink>[0],
                page,
                VersionedAnchor,
              ),
              // renders the interactive OpenAPI reference in generated API pages
              APIPage,
            })}
          />
        </DocsBody>
      </DocsPage>
    </>
  );
}

export async function generateStaticParams() {
  return generateDocsParams();
}

export async function generateMetadata(
  props: PageProps<"/docs/[[...slug]]">,
): Promise<Metadata> {
  const params = await props.params;
  const page = getPage(params.slug);
  if (!page) notFound();

  const description =
    page.data.description ?? `${page.data.title} — ${siteConfig.description}`;
  const tags = page.data.tags ?? [];
  const lastModified = page.data.lastModified?.toISOString();
  const image = getPageImage(page).url;

  return {
    title: page.data.title,
    description,
    keywords: [...new Set([...siteConfig.keywords, ...tags])],
    alternates: {
      canonical: page.url,
    },
    openGraph: {
      title: page.data.title,
      description,
      url: page.url,
      siteName: siteConfig.name,
      locale: "en_US",
      type: "article",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: `${page.data.title} — ${siteConfig.name}`,
        },
      ],
      ...(lastModified ? { modifiedTime: lastModified } : {}),
      ...(tags.length > 0 ? { tags } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: page.data.title,
      description,
      images: [
        {
          url: image,
          alt: `${page.data.title} — ${siteConfig.name}`,
        },
      ],
    },
  };
}
