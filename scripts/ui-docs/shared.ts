/** Shared paths, schemas, types, and file helpers for the @ryu/ui docs generator. */
import { readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { z } from "zod";

export const REPO_ROOT = path.resolve(import.meta.dir, "../../../..");
export const UI_PACKAGE_ROOT = path.join(REPO_ROOT, "packages/ui");
export const CONTENT_ROOT = path.join(
  REPO_ROOT,
  "apps/fumadocs/content/docs/ui",
);
export const COMPONENTS_ROOT = path.join(CONTENT_ROOT, "components");
export const PREVIEW_MODULES_SOURCE = path.join(
  REPO_ROOT,
  "apps/fumadocs/src/components/mdx/ui-component-modules.generated.ts",
);
export const PREVIEW_METADATA_SOURCE = path.join(
  REPO_ROOT,
  "apps/fumadocs/src/components/mdx/ui-component-preview-metadata.generated.ts",
);
export const COMPONENT_CATALOG_SOURCE = path.join(
  REPO_ROOT,
  "apps/fumadocs/content/docs/extend/develop/ui-package/components.mdx",
);

const missingFileContract = z.object({ code: z.literal("ENOENT") });
export const missingFileSchema = z.custom<Error & { code: "ENOENT" }>(
  (value) =>
    value instanceof Error && missingFileContract.safeParse(value).success,
);
export const packageJsonSchema = z.object({
  exports: z.record(z.string(), z.string()).optional(),
});
const catalogValueSchema = z.json();
export function lookupCatalogValue<
  T extends Readonly<Record<string, z.output<typeof catalogValueSchema>>>,
>(table: T, key: string) {
  const ownedKey = z
    .custom<keyof T & string>(
      (value) =>
        z.string().safeParse(value).success &&
        Object.hasOwn(table, String(value)),
    )
    .safeParse(key);
  return ownedKey.success ? table[ownedKey.data] : undefined;
}

export async function writeGeneratedFile(
  filePath: string,
  content: string,
): Promise<void> {
  const current = await readFile(filePath, "utf8").catch(
    (error: Parameters<typeof missingFileSchema.safeParse>[0]) => {
      if (missingFileSchema.safeParse(error).success) {
        return null;
      }
      throw error;
    },
  );
  if (current !== content) {
    await writeFile(filePath, content);
  }
}

export type UiComponent = {
  category: string;
  description: string;
  exports: string[];
  importPath: string;
  pageSlug: string;
  preview: UiComponentPreviewMetadata;
  sourcePath: string;
  title: string;
};

export type UiComponentPreviewMetadata = {
  props: Record<string, string[]>;
  targetExport: string;
};

export type ComponentHint = {
  category: string;
  description: string;
  importPath: string;
  title: string;
};
