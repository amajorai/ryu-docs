import { describe, expect, test } from "bun:test";

import {
  actionResponse,
  blockFeedback,
  pageFeedback,
  storedBlockSubmission,
  storedSubmission,
} from "./schema";

describe("docs feedback schemas", () => {
  test("accepts a bounded page submission and response", () => {
    const result = storedSubmission.safeParse({
      feedback: {
        message: "The example needs one more step.",
        opinion: "bad",
        url: "https://docs.ryuhq.com/docs/start-here",
      },
      response: {
        destinationUrl: "mailto:hello@ryuhq.com",
        submitted: false,
      },
    });

    expect(result.success).toBe(true);
  });

  test("accepts a bounded block submission and response", () => {
    const result = storedBlockSubmission.safeParse({
      feedback: {
        blockBody: "The selected paragraph explains the setup.",
        blockId: "setup-1_abc",
        message: "Please add a link to the next step.",
        opinion: "bad",
        url: "https://docs.ryuhq.com/docs/start-here",
      },
      response: {
        destinationUrl: "mailto:hello@ryuhq.com",
        submitted: false,
      },
    });

    expect(result.success).toBe(true);
  });

  test("rejects empty and oversized messages", () => {
    expect(
      pageFeedback.safeParse({
        message: "   ",
        opinion: "good",
        url: "https://docs.ryuhq.com/docs/start-here",
      }).success,
    ).toBe(false);
    expect(
      pageFeedback.safeParse({
        message: "x".repeat(2_001),
        opinion: "good",
        url: "https://docs.ryuhq.com/docs/start-here",
      }).success,
    ).toBe(false);
  });

  test("requires an explicit destination status", () => {
    expect(
      actionResponse.safeParse({
        destinationUrl: "mailto:hello@ryuhq.com",
      }).success,
    ).toBe(false);
  });

  test("rejects malformed block identity and oversized block text", () => {
    expect(
      blockFeedback.safeParse({
        blockBody: "A real block",
        blockId: "contains spaces",
        message: "Needs a clearer explanation.",
        opinion: "bad",
        url: "https://docs.ryuhq.com/docs/start-here",
      }).success,
    ).toBe(false);
    expect(
      blockFeedback.safeParse({
        blockBody: "x".repeat(4_001),
        blockId: "valid-block",
        message: "Needs a clearer explanation.",
        opinion: "bad",
        url: "https://docs.ryuhq.com/docs/start-here",
      }).success,
    ).toBe(false);
  });

  test("rejects unsafe stored destinations", () => {
    expect(
      actionResponse.safeParse({
        destinationUrl: "javascript:alert(1)",
        submitted: false,
      }).success,
    ).toBe(false);
  });
});
