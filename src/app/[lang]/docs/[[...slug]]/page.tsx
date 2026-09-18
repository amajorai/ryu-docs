import type { GeneratedPageProps } from "fumadocs-openapi";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  PageLastUpdate,
  ViewOptionsPopover,
} from "fumadocs-ui/layouts/glass/page";
import { createRelativeLink } from "fumadocs-ui/mdx";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { APIPage } from "@/components/api-page";
import { CatalogMetadata } from "@/components/catalog-metadata";
import { Feedback } from "@/components/feedback/client";
import { FeedbackText } from "@/components/feedback/text";
import { JsonLd } from "@/components/json-ld";
import { getMDXComponents, VersionedAnchor } from "@/components/mdx";
import { LevelBadge } from "@/components/mdx/level-badge";
import {
  submitDocsBlockFeedback,
  submitDocsFeedback,
} from "@/lib/docs-feedback";
import {
  archivedDocsUrl,
  docsPath,
  docsPathForLocale,
  docsPathForVersion,
  isDocsVersionSlug,
  isVersionSegment,
} from "@/lib/docs-version";
import {
  DOCS_LANGUAGES,
  isDocsLocale,
  localeForDocument,
  localizedPath,
  openGraphLocale,
} from "@/lib/i18n";
import { gitConfig } from "@/lib/layout.shared";
import { siteConfig } from "@/lib/metadata";
import {
  generateDocsPrerenderParams,
  getPage,
  getPageImage,
  source,
} from "@/lib/source";

type DocsRouteProps = {
  params: Promise<{ lang: string; slug?: string[] }>;
};

export default async function Page({ params: paramsPromise }: DocsRouteProps) {
  const params = await paramsPromise;
  if (!isDocsLocale(params.lang)) {
    notFound();
  }

  const lang = params.lang;
  const slugs = params.slug ?? [];
  if (
    slugs.length === 0 ||
    (isDocsVersionSlug(slugs[0]) && slugs.length === 1)
  ) {
    permanentRedirect(docsPathForLocale(lang, "start-here"));
  }

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
          : docsPathForLocale(lang, ...rest),
      );
    }
    permanentRedirect(docsPathForLocale(lang, ...slugs));
  }

  const page = getPage(slugs, lang);
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
        inLanguage: localeForDocument(lang),
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
            item: `${siteConfig.url}${localizedPath("/", lang)}`,
            name: "Home",
            position: 1,
          },
          {
            "@type": "ListItem",
            item: `${siteConfig.url}${localizedPath(docsPath(), lang)}`,
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
      <DocsPage toc={page.data.toc} full={page.data.full}>
        {page.data.level === undefined ? null : (
          <div className="mb-1">
            <LevelBadge level={page.data.level} />
          </div>
        )}
        <DocsTitle>{page.data.title}</DocsTitle>
        <DocsDescription className="mb-0">
          {page.data.description}
        </DocsDescription>
        <CatalogMetadata attributes={page.data.catalog} />
        <div className="flex flex-row gap-2 items-center pb-6">
          <MarkdownCopyButton markdownUrl={`${page.url}.mdx`} />
          <ViewOptionsPopover
            markdownUrl={`${page.url}.mdx`}
            githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/content/docs/${page.path}`}
          />
        </div>
        <DocsBody>
          <FeedbackText onSendAction={submitDocsBlockFeedback}>
            <MDX
              components={getMDXComponents(
                {
                  // this allows you to link to other pages with relative file paths.
                  // `source` is cast because fumadocs 16.9 tightened `createRelativeLink`'s
                  // generic so the concrete docs-page type (`type: undefined`) no longer
                  // unifies with its contravariant `LoaderConfig` parameter.
                  a: createRelativeLink(
                    source as unknown as Parameters<
                      typeof createRelativeLink
                    >[0],
                    page,
                    VersionedAnchor,
                  ),
                  // renders the interactive OpenAPI reference in generated API pages
                  // with the current page's schema preloaded server-side.
                  APIPage: async (props: GeneratedPageProps) => (
                    <APIPage page={page} {...props} />
                  ),
                },
                lang,
              )}
            />
          </FeedbackText>
        </DocsBody>
        <Feedback onSendAction={submitDocsFeedback} />
        {page.data.lastModified ? (
          <PageLastUpdate date={page.data.lastModified} />
        ) : null}
      </DocsPage>
    </>
  );
}

export const dynamicParams = true;

export async function generateStaticParams() {
  return generateDocsPrerenderParams();
}

export async function generateMetadata(
  props: DocsRouteProps,
): Promise<Metadata> {
  const params = await props.params;
  if (!isDocsLocale(params.lang)) {
    notFound();
  }
  const page = getPage(params.slug, params.lang);
  if (!page) notFound();

  const description =
    page.data.description ?? `${page.data.title} — ${siteConfig.description}`;
  const tags = page.data.tags ?? [];
  const lastModified = page.data.lastModified?.toISOString();
  const image = getPageImage(page).url;
  const languages = Object.fromEntries(
    DOCS_LANGUAGES.flatMap((locale) => {
      const localizedPage = source.getPage(page.slugs, locale);
      return localizedPage ? [[locale, localizedPage.url]] : [];
    }),
  );

  return {
    title: page.data.title,
    description,
    keywords: [...new Set([...siteConfig.keywords, ...tags])],
    alternates: {
      canonical: page.url,
      languages,
    },
    openGraph: {
      title: page.data.title,
      description,
      url: page.url,
      siteName: siteConfig.name,
      locale: openGraphLocale(params.lang),
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
