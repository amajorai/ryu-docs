import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

// The behaviour is proved by apps/server/src/hosted-mcp.test.ts (DPoP describe)
// and the real-Mongo hosted proof; this keeps the public page describing it.
const securityPage = fileURLToPath(
  new URL("../../content/docs/extend/mcp/security.mdx", import.meta.url),
);

test("the hosted MCP security page documents the DPoP scheme the endpoint enforces", async () => {
  const page = (await Bun.file(securityPage).text()).replace(/\s+/g, " ");

  expect(page).toContain("Authorization: DPoP <Better-Auth-OAuth-token>");
  expect(page).toContain("DPoP: <proof JWT for this method and URL>");
  expect(page).toContain(
    "The proof names the request method and URL, carries the hash of the token, and is accepted once.",
  );
  expect(page).toContain(
    "A DPoP-bound token sent as a bearer token is refused, as is a bearer token sent under the `DPoP` scheme.",
  );
  expect(page).toContain(
    "answers `401` with a `DPoP` challenge that lists the accepted proof algorithms",
  );
});
