import { expect, test } from "bun:test";

import { GET } from "./route";

test("an API reference page's Markdown carries its path, parameters, and responses", async () => {
  const slug = [
    "standalone",
    "sdk",
    "reference",
    "mail",
    "sending",
    "forwardMessage",
  ];
  const response = await GET(new Request("https://docs.example/llms.mdx"), {
    params: Promise.resolve({ slug }),
  });
  const body = await response.text();

  expect(response.status).toBe(200);
  expect(body).toContain("Method: POST");
  expect(body).toContain(
    "Path: /api/mail/inboxes/{id}/messages/{messageId}/forward",
  );
  expect(body).toContain(
    "## POST /api/mail/inboxes/{id}/messages/{messageId}/forward",
  );
  expect(body).toContain("| `messageId` | path | yes | string |");
  expect(body).toContain("API key scope: `mail:send`");
  expect(body).toContain("### Responses");
}, 60_000);
