import { describe, expect, test } from "bun:test";
import { remarkBlockId } from "fumadocs-core/mdx-plugins/remark-block-id";

import sourceConfig from "../../source.config";

describe("Fumadocs integrations", () => {
  test("marks selectable content blocks for feedback", () => {
    const config = sourceConfig as {
      mdxOptions?: { remarkPlugins?: unknown[] };
    };
    const plugins = config.mdxOptions?.remarkPlugins ?? [];
    const feedbackPlugin = plugins.find(
      (plugin) => Array.isArray(plugin) && plugin[0] === remarkBlockId,
    );

    expect(feedbackPlugin).toEqual([
      remarkBlockId,
      { addDataAttribute: "feedback" },
    ]);
  });
});
