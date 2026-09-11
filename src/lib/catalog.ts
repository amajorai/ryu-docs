import { z } from "zod";

export const catalogAttributesSchema = z.object({
  kind: z.enum(["app", "plugin"]),
  id: z.string(),
  category: z.string(),
  version: z.string(),
  official: z.boolean(),
  builtIn: z.boolean(),
  system: z.boolean(),
  preInstalled: z.boolean(),
  stability: z.string(),
  hidden: z.boolean(),
  external: z.boolean().optional(),
  layer: z.string().optional(),
  /**
   * Per-surface support copied from the manifest. An omitted map preserves the
   * legacy manifest contract: the catalog is available on every surface.
   */
  surfaces: z.record(z.string(), z.string()).optional(),
});

export type CatalogAttributes = z.infer<typeof catalogAttributesSchema>;
