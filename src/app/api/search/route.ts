import { createFromSource } from "fumadocs-core/search/server";

import { buildDocsSearchIndex } from "@/lib/release-notes-docs";
import { DOCS_SEARCH_LANGUAGES } from "@/lib/search-languages";
import { source } from "@/lib/source";

// `createFromSource` detects the loader's i18n config and builds one index per
// locale. Fumadocs UI sends the active locale as a query parameter. The index
// is built by `buildDocsSearchIndex` so the generated release notes archive is
// searchable by title only instead of being indexed in full for every locale.
export const { GET } = createFromSource(source, {
  buildIndex: buildDocsSearchIndex,
  localeMap: DOCS_SEARCH_LANGUAGES,
});
