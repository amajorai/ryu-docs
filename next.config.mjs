import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();
const require = createRequire(import.meta.url);
const docsRouteAliasesModule = require("./docs-route-aliases.json");
const docsRouteAliases = Array.isArray(docsRouteAliasesModule)
  ? docsRouteAliasesModule
  : Array.isArray(docsRouteAliasesModule?.default)
    ? docsRouteAliasesModule.default
    : [];
const docsLocalePattern = "en|es|fr|de|pt-br|ja|zh-cn|it|ko|hi|ru|ar";
const localizedLegacyDocsRedirects = [
  ["/docs", "/docs/0.4.0/start-here"],
  ["/docs/using-ryu/recipes", "/docs/learn/cookbook"],
  ["/docs/using-ryu/recipes/:path*", "/docs/learn/cookbook/:path*"],
  ["/docs/using-ryu", "/docs/surfaces/desktop"],
  ["/docs/using-ryu/:path*", "/docs/surfaces/desktop/:path*"],
  ["/docs/desktop/surfaces", "/docs/surfaces"],
  ["/docs/desktop", "/docs/surfaces/desktop"],
  ["/docs/desktop/:path*", "/docs/surfaces/desktop/:path*"],
  ["/docs/cli", "/docs/surfaces/cli"],
  ["/docs/cli/:path*", "/docs/surfaces/cli/:path*"],
  ["/docs/develop", "/docs/extend/develop"],
  ["/docs/develop/:path*", "/docs/extend/develop/:path*"],
  ["/docs/integrate", "/docs/extend/integrate"],
  ["/docs/integrate/:path*", "/docs/extend/integrate/:path*"],
  ["/docs/mcp", "/docs/extend/mcp"],
  ["/docs/mcp/:path*", "/docs/extend/mcp/:path*"],
  ["/docs/skills", "/docs/extend/skills"],
  ["/docs/skills/:path*", "/docs/extend/skills/:path*"],
  ["/docs/defaults", "/docs/reference/defaults"],
  ["/docs/defaults/:path*", "/docs/reference/defaults/:path*"],
  ["/docs/benchmark", "/docs/reference/benchmark"],
  ["/docs/benchmark/:path*", "/docs/reference/benchmark/:path*"],
  ["/docs/cookbook", "/docs/learn/cookbook"],
  ["/docs/cookbook/:path*", "/docs/learn/cookbook/:path*"],
  ["/docs/academy", "/docs/learn/academy"],
  ["/docs/academy/:path*", "/docs/learn/academy/:path*"],
].map(([source, destination]) => ({
  source: `/:locale(${docsLocalePattern})${source}`,
  destination: `/:locale${destination}`,
  permanent: true,
}));
const appRoot = dirname(fileURLToPath(import.meta.url));
const turbopackAssetLoader = join(appRoot, "turbopack-asset-loader.mjs");
const transformersWebEntry = join(
  dirname(require.resolve("@huggingface/transformers")),
  "transformers.web.js",
);
// Shared checkouts may have a live docs dev server holding `.next/lock`. Keep
// production verification isolated when explicitly requested without changing
// the normal deploy output directory.
const buildDir = process.env.RYU_FUMADOCS_BUILD_DIR || ".next";
const requestedBuildWorkers = Number(process.env.RYU_FUMADOCS_BUILD_WORKERS);
const buildWorkers =
  Number.isInteger(requestedBuildWorkers) && requestedBuildWorkers > 0
    ? Math.min(requestedBuildWorkers, 8)
    : undefined;
const disableBuildCache = process.env.RYU_FUMADOCS_DISABLE_BUILD_CACHE === "1";
const tsConfigPath = process.env.RYU_FUMADOCS_TS_CONFIG;

/** @type {import('next').NextConfig} */
const config = {
  // Self-contained server bundle for a lean Docker runtime (apps/fumadocs/Dockerfile).
  output: "standalone",
  distDir: buildDir,
  ...(buildWorkers || disableBuildCache
    ? {
        experimental: {
          ...(buildWorkers ? { cpus: buildWorkers } : {}),
          ...(disableBuildCache
            ? { turbopackFileSystemCacheForBuild: false }
            : {}),
        },
      }
    : {}),
  ...(tsConfigPath ? { typescript: { tsconfigPath: tsConfigPath } } : {}),
  transpilePackages: [
    "@ryu/assistant-widget",
    "@ryu/browser-local-ai",
    "@ryu/ui",
  ],
  turbopack: {
    rules: {
      "*.glb": {
        as: "*.js",
        loaders: [turbopackAssetLoader],
      },
    },
  },
  webpack(config) {
    if (disableBuildCache) {
      config.cache = false;
    }
    config.module.rules.push({
      test: /\.glb$/i,
      type: "asset/resource",
    });
    config.resolve.alias["@huggingface/transformers$"] = transformersWebEntry;
    return config;
  },
  // Type errors FAIL the deploy build. Do not re-add `ignoreBuildErrors` — it
  // lets a broken docs site ship green.
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source:
          "/:locale(en|es|fr|de|pt-br|ja|zh-cn|it|ko|hi|ru|ar)/docs/:path*.md",
        destination: "/llms.mdx/docs/:locale/:path*",
      },
      {
        source:
          "/:locale(en|es|fr|de|pt-br|ja|zh-cn|it|ko|hi|ru|ar)/docs/:path*.mdx",
        destination: "/llms.mdx/docs/:locale/:path*",
      },
      {
        source: "/docs/:path*.md",
        destination: "/llms.mdx/docs/:path*",
      },
      {
        source: "/docs/:path*.mdx",
        destination: "/llms.mdx/docs/:path*",
      },
    ];
  },
  async redirects() {
    return [
      // "/" renders the docs landing page (src/app/(home)); only "/docs"
      // (the bare docs root) forwards into the first realm.
      {
        source: "/docs",
        destination: "/docs/0.4.0/start-here",
        permanent: false,
      },
      // Keep compatibility redirects and canonical sitemap exclusions together.
      ...docsRouteAliases.flatMap(({ from, to }) => [
        {
          source: `/docs/${from}`,
          destination: `/docs/${to}`,
          permanent: true,
        },
        {
          source: `/docs/:version([0-9]+\\.[0-9]+\\.[0-9]+)/${from}`,
          destination: `/docs/:version/${to}`,
          permanent: true,
        },
        {
          source: `/:locale(${docsLocalePattern})/docs/${from}`,
          destination: `/:locale/docs/${to}`,
          permanent: true,
        },
        {
          source: `/:locale(${docsLocalePattern})/docs/:version([0-9]+\\.[0-9]+\\.[0-9]+)/${from}`,
          destination: `/:locale/docs/:version/${to}`,
          permanent: true,
        },
      ]),
      // The recipes gallery became its own "Cookbook" root. Keep the old
      // /docs/using-ryu/recipes URLs (and every recipe under it) alive. These
      // must precede the /docs/using-ryu catch-all below so recipes still land
      // on Cookbook, not desktop/recipes.
      {
        source: "/docs/using-ryu/recipes",
        destination: "/docs/learn/cookbook",
        permanent: true,
      },
      {
        source: "/docs/using-ryu/recipes/:path*",
        destination: "/docs/learn/cookbook/:path*",
        permanent: true,
      },
      // "Using Ryu" was re-cut into per-surface realms; its content now lives
      // under the "Surfaces" root. Preserve every old /docs/using-ryu URL.
      {
        source: "/docs/using-ryu",
        destination: "/docs/surfaces/desktop",
        permanent: true,
      },
      {
        source: "/docs/using-ryu/:path*",
        destination: "/docs/surfaces/desktop/:path*",
        permanent: true,
      },
      // The docs were re-cut from per-section roots into grouped realms
      // (Surfaces, Extend, Reference, Learn). Every old URL keeps
      // working. The bare /docs/desktop/surfaces page (companions) is now the
      // /docs/surfaces overview; the companions got their own pages.
      {
        source: "/docs/desktop/surfaces",
        destination: "/docs/surfaces",
        permanent: true,
      },
      {
        source: "/docs/desktop",
        destination: "/docs/surfaces/desktop",
        permanent: true,
      },
      {
        source: "/docs/desktop/:path*",
        destination: "/docs/surfaces/desktop/:path*",
        permanent: true,
      },
      {
        source: "/docs/cli",
        destination: "/docs/surfaces/cli",
        permanent: true,
      },
      {
        source: "/docs/cli/:path*",
        destination: "/docs/surfaces/cli/:path*",
        permanent: true,
      },
      {
        source: "/docs/develop",
        destination: "/docs/extend/develop",
        permanent: true,
      },
      {
        source: "/docs/develop/:path*",
        destination: "/docs/extend/develop/:path*",
        permanent: true,
      },
      {
        source: "/docs/integrate",
        destination: "/docs/extend/integrate",
        permanent: true,
      },
      {
        source: "/docs/integrate/:path*",
        destination: "/docs/extend/integrate/:path*",
        permanent: true,
      },
      {
        source: "/docs/mcp",
        destination: "/docs/extend/mcp",
        permanent: true,
      },
      {
        source: "/docs/mcp/:path*",
        destination: "/docs/extend/mcp/:path*",
        permanent: true,
      },
      {
        source: "/docs/skills",
        destination: "/docs/extend/skills",
        permanent: true,
      },
      {
        source: "/docs/skills/:path*",
        destination: "/docs/extend/skills/:path*",
        permanent: true,
      },
      {
        source: "/docs/defaults",
        destination: "/docs/reference/defaults",
        permanent: true,
      },
      {
        source: "/docs/defaults/:path*",
        destination: "/docs/reference/defaults/:path*",
        permanent: true,
      },
      {
        source: "/docs/benchmark",
        destination: "/docs/reference/benchmark",
        permanent: true,
      },
      {
        source: "/docs/benchmark/:path*",
        destination: "/docs/reference/benchmark/:path*",
        permanent: true,
      },
      {
        source: "/docs/cookbook",
        destination: "/docs/learn/cookbook",
        permanent: true,
      },
      {
        source: "/docs/cookbook/:path*",
        destination: "/docs/learn/cookbook/:path*",
        permanent: true,
      },
      {
        source: "/docs/academy",
        destination: "/docs/learn/academy",
        permanent: true,
      },
      {
        source: "/docs/academy/:path*",
        destination: "/docs/learn/academy/:path*",
        permanent: true,
      },
      ...localizedLegacyDocsRedirects,
    ];
  },
};

export default withMDX(config);
