import { remarkMdxMermaid } from "fumadocs-core/mdx-plugins";
import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import { z } from "zod";

// You can customise Zod schemas for frontmatter and `meta.json` here
// see https://fumadocs.dev/docs/mdx/collections
export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    // fumadocs' own `pageSchema` fields, restated literally, plus `level` — the
    // Academy course-difficulty number (100/200/300/...) rendered as a badge on
    // course cards and lesson pages.
    //
    // Restated rather than `pageSchema.extend({ level })`, and rather than
    // `z.object({ ...pageSchema.shape, level })`, because BOTH of those build a
    // new object type out of `fumadocs-core`'s zod (4.4.3) and hand it to
    // `defineDocs`, which `fumadocs-mdx` types against its own zod (4.3.6).
    // Instantiating one version's recursive ZodObject generics against the
    // other's makes tsc give up — "Type instantiation is excessively deep and
    // possibly infinite" — after exhausting the build's heap, which is what
    // `ignoreBuildErrors: true` was hiding here. Constructing the schema from a
    // single zod keeps the whole thing on one side of that split.
    //
    // Keep in step with `pageSchema` in fumadocs-core/source/schema if it gains
    // a field this site uses.
    schema: z.object({
      title: z.string(),
      description: z.string().optional(),
      icon: z.string().optional(),
      full: z.boolean().optional(),
      level: z.number().optional(),
      // Authored in frontmatter on 33 pages and emitted into the llms.txt
      // header by `getLLMText`. Must be declared: the schema strips undeclared
      // keys, so leaving it out drops the tags outright.
      tags: z.array(z.string()).optional(),
      // Written into generated API-reference frontmatter by fumadocs-openapi
      // and read back by `getLLMText`. Typed as an open record rather than a
      // precise shape ON PURPOSE: the schema strips unknown keys, so pinning
      // the shape here would silently DROP whatever the generator adds.
      _openapi: z.record(z.string(), z.unknown()).optional(),
    }),
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

export default defineConfig({
  mdxOptions: {
    // Convert ```mermaid code blocks into the <Mermaid> client component.
    remarkPlugins: [remarkMdxMermaid],
  },
});
