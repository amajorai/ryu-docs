import { createFromSource } from "fumadocs-core/search/server";

import { source } from "@/lib/source";

// `createFromSource` detects the loader's i18n config and builds one index per
// locale. Fumadocs UI sends the active locale as a query parameter.
export const { GET } = createFromSource(source);
