# <img src="https://raw.githubusercontent.com/amajorai/ryu/main/.github/logo.png" width="50" align="middle" alt="" />&nbsp; Ryu Docs

> The documentation site for [Ryu](https://github.com/amajorai/ryu) — 200+ pages
> plus hundreds of generated API-reference pages, live at **[ryuhq.com/docs](https://ryuhq.com/docs)**.

[![License](https://shieldcn.dev/badge/License-Apache--2.0-73DC8C.svg?logo=apache&logoColor=white)](./LICENSE)
[![Stack](https://shieldcn.dev/badge/Next.js-Fumadocs-000000.svg?logo=nextdotjs&logoColor=white)](https://github.com/amajorai/ryu)

A Next.js + Fumadocs app: the deep "state of everything" reference for Ryu, organized into
18 sidebar realms and kept honest with file citations.

## Stack

- Next.js (App Router) + `fumadocs-ui` / `fumadocs-core` / `fumadocs-mdx`
- `fumadocs-openapi` for the interactive API playground
- Tailwind CSS, `mermaid` diagrams

## Install / Build

```bash
bun install
bun run dev            # next dev on port 4000
bun run generate:docs  # regenerate API-reference pages from specs/
bun run build          # generate:docs + next build
```

Container: `docker build -t ryu-docs . && docker run -p 3002:3002 ryu-docs`.

## What it provides

- **19 sidebar realms:** Start Here, Integrate, Billing, Desktop, CLI, Mobile, Hardware, Gateway,
  Core, Primitives, Security, Develop, Apps, Plugins, Benchmark, Skills, MCP Server, Cookbook, and
  Academy — defined by `root: true` `meta.json` files.
- **Interactive OpenAPI reference** (`content/docs/extend/develop/api-reference/`): rendered by
  `fumadocs-openapi` with a live request playground.
- **Two source specs** (`specs/`): `gateway-openapi.yaml` (hand-authored) and
  `core-openapi.json` (generated from Core's Axum handlers via utoipa, e.g.
  `ryu-core --dump-openapi`).
- **Regeneration:** `bun run generate:docs` (`scripts/generate-docs.ts`) rebuilds the
  API-reference pages from the specs.

## Contributing

Content and code changes are welcome. Open a pull request in this repository; maintainers review
accepted changes, land them in the [Ryu monorepo](https://github.com/amajorai/ryu), and include
them in a later sync. Generated files and the public `main` branch may be rewritten during a sync.
See [CONTRIBUTING.md](./CONTRIBUTING.md) and [STYLE_GUIDE.md](./STYLE_GUIDE.md) for the docs voice
and page conventions.

## License

Apache-2.0. See [LICENSE](./LICENSE). © 2026 A Major Pte. Ltd.
