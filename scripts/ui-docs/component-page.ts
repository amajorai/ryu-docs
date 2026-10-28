/** Component page rendering: navigation and the per-component MDX reference page. */
import { CATEGORY_NAVIGATION_LABELS } from "./catalog-data.ts";
import {
  componentDetailSections,
  logoDetailSections,
} from "./component-page-details.ts";
import { PRESENTATION_API_DETAILS } from "./presentation-api-details.ts";
import {
  componentExample,
  hasVariantOrSizeOptions,
  primaryExport,
  usageExport,
} from "./preview-metadata.ts";
import { lookupCatalogValue, type UiComponent } from "./shared.ts";

export function componentNavigationPages(catalog: UiComponent[]): string[] {
  const pages = ["index"];
  let currentCategory = "";

  for (const component of catalog) {
    if (component.category !== currentCategory) {
      currentCategory = component.category;
      const label =
        lookupCatalogValue(CATEGORY_NAVIGATION_LABELS, currentCategory) ??
        currentCategory;
      pages.push(`---${label}---`);
    }
    pages.push(component.pageSlug);
  }

  return pages;
}

function inlineCode(value: string): string {
  return `\`${value}\``;
}

function componentNavigation(
  component: UiComponent,
  related: UiComponent[],
): string {
  const relatedText =
    related.length > 0
      ? ` In the same ${component.category.toLowerCase()} group, compare ${related
          .map(
            (peer) => `[${peer.title}](/docs/ui/components/${peer.pageSlug})`,
          )
          .join(", ")}.`
      : "";
  return `This reference is part of the [Ryu UI overview](/docs/ui), the [component catalog](/docs/ui/components), and the [UI getting started guide](/docs/ui/getting-started). Read the [primitive usage guide](/docs/ui/primitives) for composition and ownership rules.${relatedText}`;
}

export function componentPage(
  component: UiComponent,
  related: UiComponent[],
): string {
  const packageImport = `@ryu/ui/${component.importPath}`;
  const namedExports = component.exports.join(", ");
  const primary = primaryExport(component);
  const variantsSection = hasVariantOrSizeOptions(component.preview)
    ? [
        "## Variants",
        "",
        `<UiComponentPreview component=${JSON.stringify(component.importPath)} exportName=${JSON.stringify(primary)} mode="variants" />`,
        "",
        "This section renders the named variants, sizes, and states declared by the module when they are available.",
        "",
      ]
    : [];
  const detailSections = componentDetailSections(component, packageImport);
  const presentationDetails =
    lookupCatalogValue(PRESENTATION_API_DETAILS, component.importPath) ?? [];
  const usage = usageExport(component, primary);
  return [
    "---",
    `title: ${JSON.stringify(component.title)}`,
    `description: ${JSON.stringify(component.description)}`,
    "---",
    "",
    `${component.description} The module is part of the ${inlineCode("@ryu/ui")} package and is available on every surface that includes the package.`,
    "",
    componentNavigation(component, related),
    "",
    "## Preview",
    "",
    `<UiComponentPreview component=${JSON.stringify(component.importPath)} exportName=${JSON.stringify(primary)} />`,
    "",
    "The preview uses representative props and is safe to interact with. It does not call a provider, write data, or depend on a host application.",
    "",
    ...variantsSection,
    ...detailSections,
    ...presentationDetails,
    "## Settings",
    "",
    `<UiComponentPreview component=${JSON.stringify(component.importPath)} exportName=${JSON.stringify(primary)} mode="settings" />`,
    "",
    "Use the controls to compare supported settings without changing application data or calling a provider.",
    "",
    "## Import",
    "",
    "```tsx",
    `import { ${namedExports} } from "${packageImport}";`,
    "```",
    "",
    component.importPath === "components/motion/otp-input"
      ? "The module exports both `OTPCodeDisplay` and `OTPInput` from the same shared control."
      : `The module exports ${inlineCode(namedExports)}, so you can compose the primitive with its related parts.`,
    "",
    "## Usage",
    "",
    "```tsx",
    `import { ${usage} } from "${packageImport}";`,
    "",
    "export function Example() {",
    "  return (",
    `    ${componentExample(component)}`,
    "  );",
    "}",
    "```",
    "",
    "Add the props required by your workflow and compose the named exports as needed. TypeScript provides the complete prop and event contract at the import site.",
    "",
    ...logoDetailSections(component),
    "## Package path",
    "",
    inlineCode(packageImport),
    "",
    "This page is generated from the package export and source module so the catalog stays aligned with the usable component surface.",
    "",
  ].join("\n");
}
