import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  parseOperationReference,
  renderOperationMarkdown,
  renderOperationReferenceMarkdown,
  renderWebhookMarkdown,
  stripGeneratedScaffold,
} from "./openapi-markdown";

const appRoot = fileURLToPath(new URL("../../", import.meta.url));

const GENERATED_BODY = `export default function Layout(props) {
  const { APIPage, OpenAPIPage } = props.components ?? {};
  const Comp = OpenAPIPage ?? APIPage;
  return (
    <>
      {props.children}
      <Comp document="./specs/services/mail.json" operations={[{"path":"/api/mail/inboxes/{id}/messages/{messageId}/forward","method":"post"}]} showDescription />
    </>
  );
}`;

const SPEC = {
  openapi: "3.1.0",
  servers: [
    { url: "https://api.example.com", description: "Hosted" },
    {
      url: "{baseUrl}",
      description: "Self-hosted",
      variables: { baseUrl: { default: "http://127.0.0.1:9000" } },
    },
  ],
  security: [{ ApiKey: [] }],
  paths: {
    "/v1/items/{itemId}": {
      parameters: [{ $ref: "#/components/parameters/ItemId" }],
      post: {
        operationId: "updateItem",
        summary: "Update an item",
        description: "Changes | one item.",
        "x-ryu-api-key-scope": "items:write",
        parameters: [
          {
            name: "Idempotency-Key",
            in: "header",
            required: false,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ItemInput" },
              example: { name: "Widget" },
            },
          },
        },
        responses: {
          "200": {
            description: "The item.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Item" },
                examples: { one: { value: { id: "itm_1", name: "Widget" } } },
              },
            },
          },
          "409": { $ref: "#/components/responses/Conflict" },
        },
      },
    },
  },
  components: {
    parameters: {
      ItemId: {
        name: "itemId",
        in: "path",
        required: true,
        description: "The item id.",
        schema: { type: "string" },
      },
    },
    schemas: {
      ItemInput: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", description: "Display name." },
          tags: { type: "array", items: { type: "string" } },
          kind: { enum: ["a", "b"] },
        },
      },
      Item: { type: "object", properties: { id: { type: "string" } } },
      Loop: { $ref: "#/components/schemas/Loop" },
    },
    responses: { Conflict: { description: "A stale revision." } },
    securitySchemes: {
      ApiKey: { type: "apiKey", in: "header", name: "x-api-key" },
    },
  },
};

describe("parseOperationReference", () => {
  test("reads the document and operations of a generated page", () => {
    expect(parseOperationReference(GENERATED_BODY)).toEqual({
      document: "./specs/services/mail.json",
      operations: [
        {
          method: "post",
          path: "/api/mail/inboxes/{id}/messages/{messageId}/forward",
        },
      ],
    });
  });

  test("returns null for a page without an APIPage call or with bad JSON", () => {
    expect(parseOperationReference("# Title\n\nProse only.")).toBeNull();
    expect(
      parseOperationReference('<Comp document="x.json" operations={[{]} />'),
    ).toBeNull();
    expect(
      parseOperationReference('<Comp document="x.json" operations={[]} />'),
    ).toBeNull();
  });
});

describe("renderOperationMarkdown", () => {
  const markdown = renderOperationMarkdown(SPEC, "POST", "/v1/items/{itemId}");

  test("names the method, path, operation id, servers, and auth", () => {
    expect(markdown).toStartWith("## POST /v1/items/{itemId}");
    expect(markdown).toContain("Operation ID: `updateItem`");
    expect(markdown).toContain("Summary: Update an item");
    expect(markdown).toContain("- `https://api.example.com`: Hosted");
    expect(markdown).toContain(
      "- `{baseUrl}`: Self-hosted; baseUrl (default `http://127.0.0.1:9000`)",
    );
    expect(markdown).toContain(
      "Authentication (any one): `ApiKey` (`x-api-key` header)",
    );
    expect(markdown).toContain("API key scope: `items:write`");
  });

  test("lists path-level and operation parameters, resolving $ref", () => {
    expect(markdown).toContain(
      "| `itemId` | path | yes | string | The item id. |",
    );
    expect(markdown).toContain(
      "| `Idempotency-Key` | header | no | string |  |",
    );
  });

  test("describes the request body fields and example", () => {
    expect(markdown).toContain(
      "Content type `application/json` (required), schema `ItemInput`.",
    );
    expect(markdown).toContain("| `name` | string | yes | Display name. |");
    expect(markdown).toContain("| `tags` | array of string | no |  |");
    expect(markdown).toContain('| `kind` | "a" \\| "b" | no |  |');
    expect(markdown).toContain('"name": "Widget"');
  });

  test("lists every response and the first success example", () => {
    expect(markdown).toContain("| `200` | `Item` | The item. |");
    expect(markdown).toContain("| `409` |  | A stale revision. |");
    expect(markdown).toContain("Example `200` response:");
    expect(markdown).toContain('"id": "itm_1"');
  });

  test("returns null for an unknown path or method and survives a $ref cycle", () => {
    expect(
      renderOperationMarkdown(SPEC, "GET", "/v1/items/{itemId}"),
    ).toBeNull();
    expect(renderOperationMarkdown(SPEC, "POST", "/v1/missing")).toBeNull();
    expect(
      renderOperationMarkdown(null, "POST", "/v1/items/{itemId}"),
    ).toBeNull();
    const cyclic = {
      ...SPEC,
      paths: {
        "/loop": {
          get: {
            responses: {
              "200": {
                description: "Loops.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/Loop" },
                  },
                },
              },
            },
          },
        },
      },
    };
    expect(renderOperationMarkdown(cyclic, "get", "/loop")).toContain(
      "| `200` | `Loop` | Loops. |",
    );
  });

  test("renders a real Mail operation from the vendored spec", async () => {
    const spec: unknown = JSON.parse(
      await readFile(`${appRoot}specs/services/mail.json`, "utf8"),
    );
    const reference = parseOperationReference(GENERATED_BODY);
    expect(reference).not.toBeNull();
    const rendered = reference
      ? renderOperationReferenceMarkdown(spec, reference)
      : "";
    expect(rendered).toContain(
      "## POST /api/mail/inboxes/{id}/messages/{messageId}/forward",
    );
    expect(rendered).toContain("Operation ID: `forwardMessage`");
    expect(rendered).toContain("| `messageId` | path | yes | string |");
    expect(rendered).toContain("API key scope: `mail:send`");
    expect(rendered).toContain("schema `MailForwardInput`");
    expect(rendered).toContain("| `401` |");
  });
});

const WEBHOOK_PAGES = [
  {
    file: "mail/webhooks/receiveMailEvent.mdx",
    heading: "## Webhook: POST mailEvent",
    header: "`webhook-signature` | header",
  },
  {
    file: "notify/destinations/receiveDestinationDelivery.mdx",
    heading: "## Webhook: POST destinationDelivery",
    header: "`X-Ryu-Notify-Signature` | header",
  },
  {
    file: "notify/interactions/receiveResponseCallback.mdx",
    heading: "## Webhook: POST responseCallback",
    header: "`X-Ryu-Notify-Signature` | header",
  },
  {
    file: "messaging/settings/receiveMessagingEvent.mdx",
    heading: "## Webhook: POST messagingEvent",
    header: "`webhook-signature` | header",
  },
] as const;

describe("webhook pages", () => {
  const webhookSpec = {
    ...SPEC,
    webhooks: {
      itemChanged: {
        post: {
          operationId: "receiveItemChanged",
          summary: "Receive an item change",
          parameters: [
            {
              name: "x-signature",
              in: "header",
              required: true,
              description: "HMAC of the raw body.",
              schema: { type: "string" },
            },
          ],
          requestBody: {
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Item" },
                example: { id: "itm_1" },
              },
            },
          },
          responses: { "200": { description: "Accepted." } },
        },
      },
    },
  };

  test("parses the webhooks prop of a generated webhook page", () => {
    expect(
      parseOperationReference(
        '<Comp document="./specs/services/mail.json" webhooks={[{"name":"mailEvent","method":"post"}]} showDescription />',
      ),
    ).toEqual({
      document: "./specs/services/mail.json",
      operations: [],
      webhooks: [{ method: "post", name: "mailEvent" }],
    });
    expect(
      parseOperationReference('<Comp document="x.json" webhooks={[{]} />'),
    ).toBeNull();
  });

  test("renders headers, body, and example without servers or API key auth", () => {
    const markdown = renderWebhookMarkdown(webhookSpec, "post", "itemChanged");
    expect(markdown).toStartWith("## Webhook: POST itemChanged");
    expect(markdown).toContain("Operation ID: `receiveItemChanged`");
    // The direction line stands as its own paragraph and agrees with the SDK
    // samples: any 2xx acknowledges, a failed verification answers 401, and
    // signature checks apply only to signed deliveries.
    expect(markdown).toMatch(/\n\nDirection: [^\n]+\n\nOperation ID:/);
    expect(markdown).toContain("When the delivery is signed, verify");
    expect(markdown).toContain(
      "Answer any 2xx to acknowledge it; answer 401 when verification fails.",
    );
    expect(markdown).not.toContain("statuses under Responses");
    expect(markdown).toContain(
      "| `x-signature` | header | yes | string | HMAC of the raw body. |",
    );
    expect(markdown).toContain("schema `Item`");
    expect(markdown).toContain('"id": "itm_1"');
    expect(markdown).toContain("| `200` |  | Accepted. |");
    expect(markdown).not.toContain("Servers:");
    expect(markdown).not.toContain("Authentication");
    expect(renderWebhookMarkdown(webhookSpec, "get", "itemChanged")).toBeNull();
    expect(renderWebhookMarkdown(SPEC, "post", "itemChanged")).toBeNull();
  });

  for (const page of WEBHOOK_PAGES) {
    test(`projects ${page.file} from the vendored spec`, async () => {
      const raw = await readFile(
        `${appRoot}content/docs/standalone/sdk/reference/${page.file}`,
        "utf8",
      );
      const reference = parseOperationReference(raw);
      expect(reference?.webhooks?.length).toBe(1);
      const spec: unknown = JSON.parse(
        await readFile(
          `${appRoot}${reference?.document.replace("./", "") ?? ""}`,
          "utf8",
        ),
      );
      const rendered = reference
        ? renderOperationReferenceMarkdown(spec, reference)
        : "";
      expect(rendered).toStartWith(page.heading);
      expect(rendered).toContain("### Parameters");
      expect(rendered).toContain(page.header);
      expect(rendered).toContain("### Request body");
      expect(rendered).toContain("Example:");
    });
  }
});

describe("stripGeneratedScaffold", () => {
  test("drops the generator comment and Layout block and keeps the prose", () => {
    const body = [
      "{/* This file was generated by Fumadocs. Do not edit this file directly. Any changes should be made by running the generation command again. */}",
      "",
      GENERATED_BODY,
      "",
      "This reference is part of the [service API reference](/docs/standalone/sdk/reference).",
    ].join("\n");
    expect(stripGeneratedScaffold(body)).toBe(
      "This reference is part of the [service API reference](/docs/standalone/sdk/reference).",
    );
    expect(stripGeneratedScaffold("# Title\n\nProse only.")).toBe(
      "# Title\n\nProse only.",
    );
  });

  test("strips every generated reference page down to its prose", async () => {
    const root = `${appRoot}content/docs/standalone/sdk/reference`;
    const glob = new Bun.Glob("**/*.mdx");
    let generated = 0;
    for await (const file of glob.scan(root)) {
      const raw = await readFile(`${root}/${file}`, "utf8");
      if (!raw.includes("export default function Layout(props) {")) {
        continue;
      }
      generated += 1;
      const body = raw.replace(/^---\n[\s\S]*?\n---\n/, "");
      const stripped = stripGeneratedScaffold(body);
      expect({ file, layout: stripped.includes("function Layout") }).toEqual({
        file,
        layout: false,
      });
      expect({
        file,
        comment: stripped.includes("generated by Fumadocs"),
      }).toEqual({
        file,
        comment: false,
      });
    }
    expect(generated).toBeGreaterThan(100);
  });
});

describe("server lines", () => {
  test("renders the real Connect server with its variable description", async () => {
    const connect = JSON.parse(
      await readFile(`${appRoot}specs/services/connect.json`, "utf8"),
    ) as { servers: unknown; paths: Record<string, unknown> };
    const spec = {
      openapi: "3.1.0",
      servers: connect.servers,
      paths: { "/v1/skills": { get: { responses: {} } } },
    };
    const markdown = renderOperationMarkdown(spec, "GET", "/v1/skills") ?? "";
    expect(markdown).toContain(
      "- `{baseUrl}`: The URL Ryu issues with an early-access key; baseUrl (default `http://127.0.0.1:8094`): Your Connect base URL. There is no default hosted URL",
    );
    expect(markdown).not.toContain(".; ");
  });

  test("no vendored service spec renders a server line that reads `.; `", async () => {
    const glob = new Bun.Glob("*.json");
    let checked = 0;
    for await (const file of glob.scan(`${appRoot}specs/services`)) {
      const document = JSON.parse(
        await readFile(`${appRoot}specs/services/${file}`, "utf8"),
      ) as { servers?: unknown[] };
      const spec = {
        openapi: "3.1.0",
        servers: document.servers ?? [],
        paths: { "/x": { get: { responses: {} } } },
      };
      const markdown = renderOperationMarkdown(spec, "GET", "/x") ?? "";
      checked += 1;
      expect({ file, joined: markdown.includes(".; ") }).toEqual({
        file,
        joined: false,
      });
      for (const server of document.servers ?? []) {
        const variables =
          (server as { variables?: Record<string, { description?: string }> })
            .variables ?? {};
        for (const variable of Object.values(variables)) {
          const about = variable.description?.replace(/\.$/, "");
          if (about) {
            expect(markdown).toContain(about);
          }
        }
      }
    }
    expect(checked).toBe(8);
  });
});
