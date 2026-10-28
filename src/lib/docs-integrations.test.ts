import { describe, expect, test } from "bun:test";
import { remarkBlockId } from "fumadocs-core/mdx-plugins/remark-block-id";

import sourceConfig from "../../source.config";

describe("Fumadocs integrations", () => {
  test("marks selectable content blocks for feedback", () => {
    const options = sourceConfig.mdxOptions;
    if (!options || !("remarkPlugins" in options)) {
      throw new Error("Expected configured MDX remark plugins");
    }
    const plugins = options.remarkPlugins ?? [];
    if (!Array.isArray(plugins)) {
      throw new Error("Expected the authored remark plugin list");
    }
    const feedbackPlugin = plugins.find(
      (plugin) => Array.isArray(plugin) && plugin[0] === remarkBlockId,
    );

    expect(feedbackPlugin).toEqual([
      remarkBlockId,
      { addDataAttribute: "feedback" },
    ]);
  });
});
