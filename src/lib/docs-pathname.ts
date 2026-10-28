import { DEFAULT_DOCS_LOCALE } from "./i18n";

/** Proxy's internal English route and its public URL must select the same tree. */
export function publicDocsPathname(pathname: string): string {
  const internal = `/${DEFAULT_DOCS_LOCALE}/docs`;
  return pathname === internal || pathname.startsWith(`${internal}/`)
    ? pathname.slice(DEFAULT_DOCS_LOCALE.length + 1)
    : pathname;
}
