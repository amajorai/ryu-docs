import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  SERVICE_OPENAPI_LINKS,
  serviceOpenApiUrl,
} from "@/lib/service-openapi-links";

const appRoot = fileURLToPath(new URL("../../", import.meta.url));
const webDiscovery = fileURLToPath(
  new URL("../../../web/src/lib/service-openapi-discovery.ts", import.meta.url),
);

interface WebServiceDocument {
  readonly servers: string;
  readonly slug: string;
  readonly title: string;
}

describe("service OpenAPI links for the docs llms.txt", () => {
  test("cover exactly the vendored service documents", async () => {
    const vendored = (await readdir(`${appRoot}specs/services`))
      .filter((name) => name.endsWith(".json"))
      .map((name) => name.replace(/\.json$/u, ""))
      .sort();
    expect(SERVICE_OPENAPI_LINKS.map((service) => service.slug).sort()).toEqual(
      vendored,
    );
  });

  test("point at the website's raw documents", () => {
    expect(serviceOpenApiUrl("mail")).toBe(
      "https://ryuhq.com/openapi/mail.json",
    );
  });

  // The published docs satellite does not carry apps/web; there this check
  // does not apply.
  test.if(existsSync(webDiscovery))(
    "match the website's discovery list word for word",
    async () => {
      // Computed path so the docs type check does not compile apps/web.
      const web = (await import(webDiscovery)) as {
        SERVICE_OPENAPI_DOCUMENTS: readonly WebServiceDocument[];
      };
      expect(
        web.SERVICE_OPENAPI_DOCUMENTS.map(({ slug, title, servers }) => ({
          slug,
          title,
          servers,
        })),
      ).toEqual(
        SERVICE_OPENAPI_LINKS.map(({ slug, title, servers }) => ({
          slug,
          title,
          servers,
        })),
      );
    },
  );
});
