import { createMDX } from "fumadocs-mdx/next";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const withMDX = createMDX();
const require = createRequire(import.meta.url);
const transformersWebEntry = join(
  dirname(require.resolve("@huggingface/transformers")),
  "transformers.web.js",
);

/** @type {import('next').NextConfig} */
const config = {
  // Self-contained server bundle for a lean Docker runtime (apps/fumadocs/Dockerfile).
  output: "standalone",
  transpilePackages: ["@ryu/assistant-widget", "@ryu/browser-local-ai"],
  webpack(config) {
    config.resolve.alias["@huggingface/transformers$"] = transformersWebEntry;
    return config;
  },
  // Type errors FAIL the deploy build. Do not re-add `ignoreBuildErrors` — it
  // lets a broken docs site ship green.
  serverExternalPackages: ["@takumi-rs/image-response"],
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
        destination: "/docs/0.2.1/start-here",
        permanent: false,
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
