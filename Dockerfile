# Docs site (Fumadocs / Next.js, :3002) — SATELLITE build.
#
# This repo is a flattened mirror of `apps/fumadocs` from the Ryu monorepo, so the
# build context is this repo's root (no `apps/fumadocs` prefix, no workspace install).
# The monorepo keeps its own root-context Dockerfile at `apps/fumadocs/Dockerfile`;
# this one replaces it in the mirror (tools/mirror-satellites.sh overlays it).
FROM oven/bun:1.4.4 AS builder
WORKDIR /app
ENV SKIP_ENV_VALIDATION=1
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
# --ignore-scripts skips the fumadocs-mdx postinstall so it can run below in the
# right order (after generate:docs writes the API-reference pages).
# --linker hoisted: flat node_modules so the native @takumi-rs/image-response
# binding (used by the /og route) is resolvable; bun's default isolated linker
# leaves the platform binding unfindable ("Cannot find native binding").
RUN bun install --ignore-scripts --linker hoisted
# Build order: generate the OpenAPI reference pages -> generate the MDX .source
# index (gitignored, so it must be built here) -> next build (standalone output).
RUN bun run generate:docs \
 && bun x fumadocs-mdx \
 && bun x next build \
 && mkdir -p public

# Lean runtime. node:22.23.4-trixie-slim (glibc, NOT alpine/musl) so the native
# @takumi-rs/image-response OG-image binary loads at runtime.
FROM node:22.23.4-trixie-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3002
ENV HOSTNAME=0.0.0.0
COPY --chown=node:node --from=builder /app/.next/standalone ./
COPY --chown=node:node --from=builder /app/.next/static ./.next/static
# fumadocs-openapi resolves the API reference specs from /app at request time,
# so they must be in the runtime image as well as in the builder.
COPY --chown=node:node --from=builder /app/specs ./specs
COPY --chown=node:node --from=builder /app/public ./public
# Copied as node above; only the WORKDIR itself still needs handing over. A
# recursive chown here would duplicate every copied file into a new layer.
RUN chown node:node /app
EXPOSE 3002
USER node
CMD ["node", "server.js"]
