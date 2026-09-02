import { createMDX } from "fumadocs-mdx/next";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const withMDX = createMDX();
const require = createRequire(import.meta.url);
const appRoot = dirname(fileURLToPath(import.meta.url));
const turbopackAssetLoader = join(appRoot, "turbopack-asset-loader.mjs");
const transformersWebEntry = join(
  dirname(require.resolve("@huggingface/transformers")),
  "transformers.web.js",
);

/** @type {import('next').NextConfig} */
const config = {
  // Self-contained server bundle for a lean Docker runtime (apps/fumadocs/Dockerfile).
  output: "standalone",
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
        destination: "/docs/0.2.6/start-here",
        permanent: false,
      },
      // Mobile and Browser extension have dedicated roots again. Keep the
      // grouped Surfaces URLs working as compatibility links.
      {
        source: "/docs/surfaces/mobile",
        destination: "/docs/mobile",
        permanent: true,
      },
      {
        source: "/docs/:version([0-9]+\\.[0-9]+\\.[0-9]+)/surfaces/mobile",
        destination: "/docs/:version/mobile",
        permanent: true,
      },
      {
        source: "/docs/surfaces/browser-extension",
        destination: "/docs/browser-extension",
        permanent: true,
      },
      {
        source: "/docs/:version([0-9]+\\.[0-9]+\\.[0-9]+)/surfaces/browser-extension",
        destination: "/docs/:version/browser-extension",
        permanent: true,
      },
      // Retire unreleased campaign, preview-app, and internal reference pages
      // without leaving old bookmarks at a dead end.
      {
        source: "/docs/billing/battle-pass",
        destination: "/docs/billing",
        permanent: true,
      },
      {
        source: "/docs/:version([0-9]+\\.[0-9]+\\.[0-9]+)/billing/battle-pass",
        destination: "/docs/:version/billing",
        permanent: true,
      },
      {
        source: "/docs/apps/content",
        destination: "/docs/apps",
        permanent: true,
      },
      {
        source: "/docs/apps/reelfarm",
        destination: "/docs/apps",
        permanent: true,
      },
      {
        source: "/docs/apps/token-table",
        destination: "/docs/apps",
        permanent: true,
      },
      {
        source: "/docs/:version([0-9]+\\.[0-9]+\\.[0-9]+)/apps/content",
        destination: "/docs/:version/apps",
        permanent: true,
      },
      {
        source: "/docs/:version([0-9]+\\.[0-9]+\\.[0-9]+)/apps/reelfarm",
        destination: "/docs/:version/apps",
        permanent: true,
      },
      {
        source: "/docs/:version([0-9]+\\.[0-9]+\\.[0-9]+)/apps/token-table",
        destination: "/docs/:version/apps",
        permanent: true,
      },
      {
        source: "/docs/reference/defaults/apps",
        destination: "/docs/apps",
        permanent: true,
      },
      {
        source: "/docs/reference/defaults/ports",
        destination: "/docs/reference/defaults",
        permanent: true,
      },
      {
        source: "/docs/:version([0-9]+\\.[0-9]+\\.[0-9]+)/reference/defaults/apps",
        destination: "/docs/:version/apps",
        permanent: true,
      },
      {
        source: "/docs/:version([0-9]+\\.[0-9]+\\.[0-9]+)/reference/defaults/ports",
        destination: "/docs/:version/reference/defaults",
        permanent: true,
      },
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
    ];
  },
};

export default withMDX(config);
