import { createOpenAPI } from "fumadocs-openapi/server";

/**
 * Render-time OpenAPI server.
 *
 * Holds every spec the docs reference. The generated MDX pages call
 * `<APIPage document="<schema-id>" ... />`, where the schema id is the exact
 * input path string below; `APIPage` resolves the operation against this server,
 * so the inputs here must stay in sync with the ones in `scripts/generate-docs.ts`.
 *
 * - `gateway-openapi.yaml` is hand-authored (the OpenAI-compatible gateway surface)
 *   and canonical; `node scripts/sync-gateway-openapi.mjs` copies it to the SDK.
 * - `core-openapi.json` is generated from Core's Axum handlers by `utoipa`
 *   (`apps/core` → `bun run generate:openapi`), then consumed here.
 * - `services/<id>.json` are byte-identical copies of the standalone service
 *   documents in `apps/web/public/openapi/`, vendored by
 *   `node scripts/sync-service-openapi.mjs` (repository root) and rendered
 *   under `standalone/sdk/reference/`. `SERVICE_OPENAPI_INPUTS` must match the
 *   inputs in `scripts/api-reference-specs.ts`; a test enforces it.
 *
 * This module stays lightweight (no UI imports) so it is safe to pull into
 * `source.ts` for the page-tree `loaderPlugin`. The `<APIPage />` render
 * component lives in `@/components/api-page` (server-only, page render path).
 */
export const SERVICE_OPENAPI_INPUTS = [
  "./specs/services/managed-agents.json",
  "./specs/services/mail.json",
  "./specs/services/notify.json",
  "./specs/services/box.json",
  "./specs/services/connect.json",
  "./specs/services/passport.json",
  "./specs/services/sites.json",
  "./specs/services/messaging.json",
] as const;

export const OPENAPI_INPUTS = [
  "./specs/gateway-openapi.yaml",
  "./specs/core-openapi.json",
  ...SERVICE_OPENAPI_INPUTS,
] as const;

export const openapi = createOpenAPI({
  input: [...OPENAPI_INPUTS],
});
