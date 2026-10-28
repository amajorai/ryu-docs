/**
 * CLI entry for the @ryu/ui component docs generator.
 *
 * The implementation lives in `./ui-docs/`; this module keeps the public
 * import path used by tests and the `generate:ui` package script.
 */
import { generateUiDocs } from "./ui-docs/render.ts";

export { buildUiCatalog } from "./ui-docs/catalog.ts";
export { extractComponentExports } from "./ui-docs/component-exports.ts";
export { componentNavigationPages } from "./ui-docs/component-page.ts";
export { hasVariantOrSizeOptions } from "./ui-docs/preview-metadata.ts";
export {
  generateUiDocs,
  generateUiPreviewModules,
  previewMetadataSource,
  previewModulesSource,
  renderUiDocsPages,
  type UiDocsPage,
} from "./ui-docs/render.ts";
export type {
  UiComponent,
  UiComponentPreviewMetadata,
} from "./ui-docs/shared.ts";

if (import.meta.main) {
  const catalog = await generateUiDocs();
  console.log(`Generated ${catalog.length} @ryu/ui component pages.`);
}
