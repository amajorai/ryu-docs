import { z } from "zod";

const optionalText = z.string().optional();
const optionalTexts = z.array(z.string()).optional();
const toolConfigSchema = z.object({
  slug: optionalText,
  name: optionalText,
  description: optionalText,
  backend: optionalText,
  method: optionalText,
  input_schema: z
    .object({
      type: optionalText,
      properties: z
        .record(
          z.string(),
          z.object({
            type: optionalText,
            description: optionalText,
            enum: z.array(z.json()).optional(),
          }),
        )
        .optional(),
      required: optionalTexts,
    })
    .optional(),
});
const runnableSchema = z.object({
  id: optionalText,
  name: optionalText,
  kind: optionalText,
  config: toolConfigSchema
    .extend({
      label: optionalText,
      ui_format: optionalText,
      policy_type: optionalText,
      definition: z
        .object({ note: optionalText, surface: optionalText })
        .optional(),
      system_prompt: optionalText,
      model: optionalText,
      tools: optionalTexts,
      skill_id: optionalText,
    })
    .optional(),
});
const contributionSchema = z.object({
  id: optionalText,
  title: optionalText,
  label: optionalText,
  command: optionalText,
  tool_id: optionalText,
  description: optionalText,
  type: optionalText,
  on: optionalText,
  placement: optionalText,
  anchor: optionalText,
  attribution: optionalText,
  attributionUrl: optionalText,
  backdropId: optionalText,
  capability: optionalText,
  fields: z
    .array(
      z.object({
        label: optionalText,
        type: optionalText,
        description: optionalText,
      }),
    )
    .optional(),
});
const provideSchema = z.object({
  capability: optionalText,
  version: optionalText,
  title: optionalText,
  grant: optionalText,
  target: optionalText,
  tools: z
    .record(
      z.string(),
      z.object({
        tool: optionalText,
        adapter: z.object({ tools: optionalTexts }).optional(),
      }),
    )
    .optional(),
});

/** The public catalog projection of JSON manifests, without SDK defaults. */
export const catalogManifestSchema = z.object({
  id: optionalText,
  name: optionalText,
  version: optionalText,
  category: optionalText,
  description: optionalText,
  tagline: optionalText,
  keywords: optionalTexts,
  icon: optionalText,
  author: z.union([z.string(), z.object({ name: optionalText })]).optional(),
  repository: optionalText,
  external: z.boolean().optional(),
  system: z.boolean().optional(),
  mandatory: z.boolean().optional(),
  hidden: z.boolean().optional(),
  source: optionalText,
  stability: optionalText,
  surfaces: z
    .record(z.string(), z.object({ support: optionalText }))
    .optional(),
  targets: optionalTexts,
  engines: z.record(z.string(), z.string()).optional(),
  runnables: z.array(runnableSchema).optional(),
  permission_grants: optionalTexts,
  permission_levels: z
    .array(
      z.object({
        id: optionalText,
        label: optionalText,
        description: optionalText,
        implies: optionalTexts,
      }),
    )
    .optional(),
  provides: z.array(provideSchema).optional(),
  mcp_servers: z
    .record(z.string(), z.object({ description: optionalText }))
    .optional(),
  sidecars: z.array(z.object({ name: optionalText })).optional(),
  requires: z
    .object({
      apps: z
        .array(z.object({ id: optionalText, min_version: optionalText }))
        .optional(),
      grants: optionalTexts,
    })
    .optional(),
  activation_events: optionalTexts,
  // Object-form contribution groups (for example LSP servers) do not render as UI lists.
  contributes: z
    .record(
      z.string(),
      z.preprocess(
        (value) => (Array.isArray(value) ? value : []),
        z.array(contributionSchema),
      ),
    )
    .optional(),
});

export type CatalogManifest = z.infer<typeof catalogManifestSchema>;
export type CatalogRunnable = z.infer<typeof runnableSchema>;
export type CatalogToolConfig = z.infer<typeof toolConfigSchema>;

export type CatalogProvide = z.infer<typeof provideSchema>;
