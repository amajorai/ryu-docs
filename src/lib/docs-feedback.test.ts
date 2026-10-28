import { beforeEach, describe, expect, test } from "bun:test";
import { z } from "zod";

import { submitDocsBlockFeedback, submitDocsFeedback } from "./docs-feedback";
import { resetFeedbackBudget } from "./docs-feedback-budget";

beforeEach(() => {
  resetFeedbackBudget();
});

const validFeedback = {
  message: "The code sample needs a note about the required scope.",
  opinion: "bad" as const,
  url: "http://localhost:4000/docs/0.3.0/extend/mcp/quickstart",
};

describe("docs feedback action", () => {
  test("provides an email fallback without a server token", async () => {
    const previousToken = process.env.DOCS_FEEDBACK_GITHUB_TOKEN;
    delete process.env.DOCS_FEEDBACK_GITHUB_TOKEN;

    try {
      const response = await submitDocsFeedback(validFeedback);

      expect(response.submitted).toBe(false);
      expect(
        response.destinationUrl.startsWith("mailto:hello@ryuhq.com?"),
      ).toBe(true);
      expect(response.destinationUrl.includes("quickstart")).toBe(true);
    } finally {
      if (previousToken === undefined) {
        delete process.env.DOCS_FEEDBACK_GITHUB_TOKEN;
      } else {
        process.env.DOCS_FEEDBACK_GITHUB_TOKEN = previousToken;
      }
    }
  });

  test("forwards to GitHub when configured and returns its URL", async () => {
    const previousToken = process.env.DOCS_FEEDBACK_GITHUB_TOKEN;
    const previousFetch = globalThis.fetch;
    process.env.DOCS_FEEDBACK_GITHUB_TOKEN = "test-token";
    globalThis.fetch = Object.assign(
      async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
        expect(init?.method).toBe("POST");
        expect(new Headers(init?.headers).get("authorization")).toBe(
          "Bearer test-token",
        );
        return new Response(
          JSON.stringify({
            html_url: "https://github.com/amajorai/ryu/issues/1",
          }),
          { headers: { "Content-Type": "application/json" }, status: 201 },
        );
      },
      { preconnect: previousFetch.preconnect },
    );

    try {
      const response = await submitDocsFeedback(validFeedback);

      expect(response).toEqual({
        destinationUrl: "https://github.com/amajorai/ryu/issues/1",
        submitted: true,
      });
    } finally {
      globalThis.fetch = previousFetch;
      if (previousToken === undefined) {
        delete process.env.DOCS_FEEDBACK_GITHUB_TOKEN;
      } else {
        process.env.DOCS_FEEDBACK_GITHUB_TOKEN = previousToken;
      }
    }
  });

  test("includes selected block context in the email fallback", async () => {
    const previousToken = process.env.DOCS_FEEDBACK_GITHUB_TOKEN;
    delete process.env.DOCS_FEEDBACK_GITHUB_TOKEN;

    try {
      const response = await submitDocsBlockFeedback({
        ...validFeedback,
        blockBody: "The selected paragraph explains the setup.",
        blockId: "setup-1_abc",
      });
      const destination = new URL(response.destinationUrl);
      const body = destination.searchParams.get("body") ?? "";

      expect(response.submitted).toBe(false);
      expect(body).toContain("setup-1_abc");
      expect(body).toContain("The selected paragraph explains the setup.");
    } finally {
      if (previousToken === undefined) {
        delete process.env.DOCS_FEEDBACK_GITHUB_TOKEN;
      } else {
        process.env.DOCS_FEEDBACK_GITHUB_TOKEN = previousToken;
      }
    }
  });

  test("forwards selected block context to GitHub", async () => {
    const previousToken = process.env.DOCS_FEEDBACK_GITHUB_TOKEN;
    const previousFetch = globalThis.fetch;
    process.env.DOCS_FEEDBACK_GITHUB_TOKEN = "test-token";
    globalThis.fetch = Object.assign(
      async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
        const payload = z
          .object({ body: z.string(), title: z.string() })
          .parse(JSON.parse(String(init?.body)));

        expect(payload.title).toContain("#setup-1_abc");
        expect(payload.body).toContain("- Block: #setup-1_abc");
        expect(payload.body).toContain(
          "The selected paragraph explains the setup.",
        );

        return new Response(
          JSON.stringify({
            html_url: "https://github.com/amajorai/ryu/issues/2",
          }),
          { headers: { "Content-Type": "application/json" }, status: 201 },
        );
      },
      { preconnect: previousFetch.preconnect },
    );

    try {
      const response = await submitDocsBlockFeedback({
        ...validFeedback,
        blockBody: "The selected paragraph explains the setup.",
        blockId: "setup-1_abc",
      });

      expect(response).toEqual({
        destinationUrl: "https://github.com/amajorai/ryu/issues/2",
        submitted: true,
      });
    } finally {
      globalThis.fetch = previousFetch;
      if (previousToken === undefined) {
        delete process.env.DOCS_FEEDBACK_GITHUB_TOKEN;
      } else {
        process.env.DOCS_FEEDBACK_GITHUB_TOKEN = previousToken;
      }
    }
  });

  test("rejects a feedback URL from another origin", async () => {
    await expect(
      submitDocsFeedback({
        ...validFeedback,
        url: "https://example.com/docs/quickstart",
      }),
    ).rejects.toThrow("Ryu Docs site");
  });

  test("accepts localized docs URLs", async () => {
    const response = await submitDocsFeedback({
      ...validFeedback,
      url: "http://localhost:4000/es/docs/0.4.0/start-here",
    });

    expect(response.submitted).toBe(false);
    expect(new URL(response.destinationUrl).searchParams.get("body")).toContain(
      "/es/docs/0.4.0/start-here",
    );
  });

  test.each([
    { id: "null", payload: null },
    { id: "missing", payload: {} },
    { id: "wrong-type", payload: { html_url: 42 } },
  ])("returns email fallback for malformed GitHub acknowledgement $id", async ({
    id,
    payload,
  }) => {
    const previousToken = process.env.DOCS_FEEDBACK_GITHUB_TOKEN;
    const previousFetch = globalThis.fetch;
    process.env.DOCS_FEEDBACK_GITHUB_TOKEN = "test-token";
    let requests = 0;
    globalThis.fetch = Object.assign(
      async () => {
        requests++;
        return Response.json(payload, { status: 201 });
      },
      { preconnect: previousFetch.preconnect },
    );
    try {
      const result = await submitDocsFeedback({
        ...validFeedback,
        message: `Malformed GitHub acknowledgement ${id}`,
      });
      expect(requests).toBe(1);
      expect(result.submitted).toBe(false);
      expect(result.destinationUrl.startsWith("mailto:hello@ryuhq.com?")).toBe(
        true,
      );
    } finally {
      globalThis.fetch = previousFetch;
      if (previousToken === undefined)
        delete process.env.DOCS_FEEDBACK_GITHUB_TOKEN;
      else process.env.DOCS_FEEDBACK_GITHUB_TOKEN = previousToken;
    }
  });

  test("bounds concurrent GitHub requests and sends replays to email", async () => {
    const previousToken = process.env.DOCS_FEEDBACK_GITHUB_TOKEN;
    const previousFetch = globalThis.fetch;
    process.env.DOCS_FEEDBACK_GITHUB_TOKEN = "test-token";
    let requests = 0;
    globalThis.fetch = Object.assign(
      async () => {
        requests++;
        return Response.json(
          { html_url: "https://github.com/amajorai/ryu/issues/3" },
          { status: 201 },
        );
      },
      { preconnect: previousFetch.preconnect },
    );
    try {
      const results = await Promise.all(
        Array.from({ length: 100 }, () =>
          submitDocsFeedback({
            ...validFeedback,
            message: "Concurrent repeated report",
          }),
        ),
      );
      expect(requests).toBe(1);
      expect(results.filter((result) => result.submitted)).toHaveLength(1);
      expect(
        results.filter((result) => result.destinationUrl.startsWith("mailto:")),
      ).toHaveLength(99);
      await Promise.all(
        Array.from({ length: 100 }, (_, index) =>
          submitDocsFeedback({
            ...validFeedback,
            message: `Unique bounded report ${index}`,
          }),
        ),
      );
      expect(requests).toBeLessThanOrEqual(20);
    } finally {
      globalThis.fetch = previousFetch;
      if (previousToken === undefined)
        delete process.env.DOCS_FEEDBACK_GITHUB_TOKEN;
      else process.env.DOCS_FEEDBACK_GITHUB_TOKEN = previousToken;
    }
  });
});
