import type { GeneratedPageProps } from "fumadocs-openapi";

import { openapi } from "@/lib/openapi";
import type { DocsPage } from "@/lib/source";
import { OpenAPIPage } from "./api-page.client";

/**
 * Server component rendered for every `<APIPage />` in the generated OpenAPI MDX.
 *
 * Kept out of `@/lib/openapi` so the heavy UI/highlighter import is only pulled
 * into the docs page render path, never into `source.ts`.
 */
type APIPageProps = GeneratedPageProps & {
  page: DocsPage;
};

export async function APIPage({ page, ...props }: APIPageProps) {
  const preloaded = await openapi.preloadOpenAPIPage(page);

  // OpenAPI 11-generated pages declare `_openapi.preload`. Keep the runtime
  // compatible with older generated MDX that predates that frontmatter field;
  // those pages still identify the schema through `document`.
  if (preloaded.preloaded.docs[props.document]) {
    return <OpenAPIPage {...props} {...preloaded} />;
  }

  const schema = await openapi.getSchema(props.document);
  return (
    <OpenAPIPage
      {...props}
      payload={{
        bundled: schema.bundled,
        proxyUrl: openapi.options.proxyUrl,
      }}
    />
  );
}
