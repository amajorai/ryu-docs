import { RYU_ORGANIZATION_URL } from "@/lib/metadata";

/**
 * The standalone services' raw OpenAPI documents, as the docs llms.txt
 * indexes advertise them. The website serves each one at
 * `https://ryuhq.com/openapi/<slug>.json`.
 *
 * This mirrors `SERVICE_OPENAPI_DOCUMENTS` in
 * apps/web/src/lib/service-openapi-discovery.ts (the website's `/llms.txt` and
 * AI Catalog list) word for word, because the published docs satellite does
 * not carry apps/web. `service-openapi-links.test.ts` fails when the two
 * drift, and checks the slugs against the vendored `specs/services/`.
 * Nothing here claims general availability.
 */
export interface ServiceOpenApiLink {
  /** Where the service answers, with its documented status. */
  readonly servers: string;
  /** Basename of `/openapi/<slug>.json` on the website. */
  readonly slug: string;
  readonly title: string;
}

export const SERVICE_OPENAPI_LINKS: readonly ServiceOpenApiLink[] = [
  {
    slug: "managed-agents",
    title: "Managed Agents",
    servers:
      "https://api.ryuhq.com/api/v1/managed-agents (preview; off unless enabled for the deployment and your organization)",
  },
  {
    slug: "mail",
    title: "Mail",
    servers:
      "https://api.ryuhq.com (hosted Mail, with a `ryu_` key that has Mail scopes or a node gateway key) or a self-hosted Mail server",
  },
  {
    slug: "messaging",
    title: "Messaging",
    servers:
      "https://api.ryuhq.com/api/messaging (early access, enabled per organization)",
  },
  {
    slug: "notify",
    title: "Notify",
    servers:
      "https://notify.ryuhq.com (hosted, early access; the self-hosted service is not yet published)",
  },
  {
    slug: "box",
    title: "Box",
    servers:
      "https://box.ryuhq.com (hosted, early access; the self-hosted service is not yet published)",
  },
  {
    slug: "connect",
    title: "Connect",
    servers:
      "the URL Ryu issues with an early-access key; there is no default hosted URL, and the self-hosted service is not yet published",
  },
  {
    slug: "passport",
    title: "Passport",
    servers:
      "the URL Ryu issues with early access; there is no default hosted URL, and the self-hosted service is not yet published",
  },
  {
    slug: "sites",
    title: "Sites",
    servers:
      "a self-hosted Sites process's management listener; there is no Ryu-hosted Sites",
  },
];

/** The website URL of one service's OpenAPI document. */
export function serviceOpenApiUrl(slug: string): string {
  return `${RYU_ORGANIZATION_URL}/openapi/${slug}.json`;
}
