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
import { DocsTOC } from "@/components/docs-toc";
import { Feedback } from "@/components/feedback/client";
import { FeedbackText } from "@/components/feedback/text";
import { JsonLd } from "@/components/json-ld";
import { DocsAnchor, getMDXComponents } from "@/components/mdx";
import { LevelBadge } from "@/components/mdx/level-badge";
import { hasLocalizedDocsContent } from "@/lib/canonical-docs";
import {
  submitDocsBlockFeedback,
  submitDocsFeedback,
} from "@/lib/docs-feedback";
import {
  docsPath,
  docsPathForLocale,
  isVersionSegment,
} from "@/lib/docs-version";
import { tocTitle } from "@/lib/fumadocs-translations";
import {
  DEFAULT_DOCS_LOCALE,
  DOCS_LANGUAGES,
  isDocsLocale,
  localeForDocument,
  localizedPath,
  openGraphLocale,
} from "@/lib/i18n";
import { gitConfig } from "@/lib/layout.shared";
import {
  docsIdentityNodes,
  RYU_ORGANIZATION_ID,
  siteConfig,
} from "@/lib/metadata";
import {
  generateDocsPrerenderParams,
  getCanonicalDocsPage,
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
  if (slugs.length === 0) {
    permanentRedirect(docsPathForLocale(lang, "start-here"));
  }

  // Docs URLs carry no version. next.config.mjs already redirects a
  // version-shaped first segment (a link published by an older release); this
  // covers any request that reaches the page route with one anyway.
  if (isVersionSegment(slugs[0])) {
    const rest = slugs.slice(1);
    permanentRedirect(
      docsPathForLocale(lang, ...(rest.length > 0 ? rest : ["start-here"])),
    );
  }

  const page = getPage(slugs, lang);
  if (!page) notFound();

  const hasTranslation = hasLocalizedDocsContent(page);
  const canonicalPage = getCanonicalDocsPage(page);

  const MDX = page.data.body;
  const description =
    page.data.description ?? `${page.data.title} — ${siteConfig.description}`;
  const tags = page.data.tags ?? [];
  const lastModified = page.data.lastModified?.toISOString();
  const pageUrl = new URL(canonicalPage.url, siteConfig.url).toString();
  const imageUrl = new URL(
    getPageImage(canonicalPage).url,
    siteConfig.url,
  ).toString();
  const websiteId = `${siteConfig.url}/#website`;
  const articleBase = {
    "@id": `${pageUrl}#article`,
    "@type": "TechArticle",
    author: { "@id": RYU_ORGANIZATION_ID },
    description,
    headline: page.data.title,
    image: [imageUrl],
    inLanguage: localeForDocument(hasTranslation ? lang : DEFAULT_DOCS_LOCALE),
    isPartOf: { "@id": websiteId },
    mainEntityOfPage: pageUrl,
    publisher: { "@id": RYU_ORGANIZATION_ID },
  };
  type ArticlePublicationDetails = {
    dateModified: string;
    keywords: string[];
    url: string;
  };
  const publicationDetails: Partial<ArticlePublicationDetails> = {};
  if (lastModified) {
    publicationDetails.dateModified = lastModified;
  }
  if (tags.length > 0) {
    publicationDetails.keywords = tags;
  }
  publicationDetails.url = pageUrl;
  const article = { ...articleBase, ...publicationDetails };
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      ...docsIdentityNodes(),
      article,
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            item: `${siteConfig.url}${localizedPath("/", hasTranslation ? lang : DEFAULT_DOCS_LOCALE)}`,
            name: "Home",
            position: 1,
          },
          {
            "@type": "ListItem",
            item: `${siteConfig.url}${localizedPath(docsPath(), hasTranslation ? lang : DEFAULT_DOCS_LOCALE)}`,
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
      <link
        href={`${canonicalPage.url}.mdx`}
        rel="alternate"
        type="text/markdown"
      />
      <JsonLd data={jsonLd} />
      {/* Glass renders the article and TOC as plain grid items, so the page
          had no main landmark. "contents" keeps both on the layout grid, and
          global.css offsets the article under the site header through
          data-docs-main (the /proof page has its own, unpadded <main>). */}
      <main className="contents" data-docs-main="">
        {/* The classic TOC column replaces Glass' hover TOC from xl up. */}
        <DocsTOC title={tocTitle(lang)} toc={page.data.toc}>
          <DocsPage
            full={page.data.full}
            tableOfContent={{ container: { className: "xl:hidden" } }}
            toc={page.data.toc}
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
                      a: createRelativeLink(source, page, DocsAnchor),
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
        </DocsTOC>
      </main>
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
  const hasTranslation = hasLocalizedDocsContent(page);
  const canonicalPage = getCanonicalDocsPage(page);

  const description =
    page.data.description ?? `${page.data.title} — ${siteConfig.description}`;
  const tags = page.data.tags ?? [];
  const lastModified = page.data.lastModified?.toISOString();
  const image = getPageImage(canonicalPage).url;
  const languages = Object.fromEntries(
    DOCS_LANGUAGES.flatMap((locale) => {
      const localizedPage = source.getPage(page.slugs, locale);
      return localizedPage && hasLocalizedDocsContent(localizedPage)
        ? [[locale, localizedPage.url]]
        : [];
    }),
  );

  const openGraph: Extract<
    NonNullable<Metadata["openGraph"]>,
    { type: "article" }
  > = {
    title: page.data.title,
    description,
    url: canonicalPage.url,
    siteName: siteConfig.name,
    locale: openGraphLocale(hasTranslation ? params.lang : DEFAULT_DOCS_LOCALE),
    type: "article",
    images: [
      {
        url: image,
        width: 1200,
        height: 630,
        alt: `${page.data.title} — ${siteConfig.name}`,
      },
    ],
  };
  if (lastModified) {
    openGraph.modifiedTime = lastModified;
  }
  if (tags.length > 0) {
    openGraph.tags = tags;
  }
  return {
    title: page.data.title,
    description,
    metadataBase: new URL(siteConfig.url),
    keywords: [...new Set([...siteConfig.keywords, ...tags])],
    alternates: {
      canonical: canonicalPage.url,
      languages,
    },
    openGraph: openGraph,
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
