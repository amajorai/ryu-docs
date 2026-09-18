"use server";

import {
  type ActionResponse,
  actionResponse,
  type BlockFeedback,
  blockFeedback,
  type PageFeedback,
  pageFeedback,
} from "@/components/feedback/schema";
import { isDocsLocale } from "@/lib/i18n";
import { siteConfig } from "@/lib/metadata";

const DEFAULT_GITHUB_OWNER = "amajorai";
const DEFAULT_GITHUB_REPOSITORY = "ryu";
const FEEDBACK_EMAIL = "hello@ryuhq.com";

type DocsFeedback = PageFeedback | BlockFeedback;

function feedbackBody(feedback: DocsFeedback, pageUrl: URL): string {
  const opinion = feedback.opinion === "good" ? "Good" : "Needs improvement";
  const blockContext =
    "blockId" in feedback
      ? [
          `- Block: #${feedback.blockId}`,
          "- Block text:",
          ...feedback.blockBody.split(/\r?\n/).map((line) => `> ${line}`),
        ]
      : [];

  return [
    "## Documentation feedback",
    "",
    `- Opinion: ${opinion}`,
    `- Page: ${pageUrl.href}`,
    ...blockContext,
    "",
    feedback.message,
    "",
    "> Submitted from Ryu Docs.",
  ].join("\n");
}

function fallbackUrl(feedback: DocsFeedback, pageUrl: URL): string {
  const params = new URLSearchParams({
    body: feedbackBody(feedback, pageUrl),
    subject: `Ryu Docs feedback: ${pageUrl.pathname}${
      "blockId" in feedback ? ` #${feedback.blockId}` : ""
    }`,
  });

  return `mailto:${FEEDBACK_EMAIL}?${params.toString()}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function sendToGitHub(
  feedback: DocsFeedback,
  pageUrl: URL,
  token: string,
): Promise<string> {
  const owner =
    process.env.DOCS_FEEDBACK_GITHUB_OWNER?.trim() || DEFAULT_GITHUB_OWNER;
  const repository =
    process.env.DOCS_FEEDBACK_GITHUB_REPOSITORY?.trim() ||
    DEFAULT_GITHUB_REPOSITORY;
  const response = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/issues`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        body: feedbackBody(feedback, pageUrl),
        title: `[Docs] ${pageUrl.pathname}${
          "blockId" in feedback ? ` #${feedback.blockId}` : ""
        }`,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`GitHub feedback request failed with ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!isRecord(payload) || typeof payload.html_url !== "string") {
    throw new Error("GitHub feedback response did not include a URL");
  }

  return payload.html_url;
}

function isAllowedPageUrl(pageUrl: URL): boolean {
  if (pageUrl.protocol !== "http:" && pageUrl.protocol !== "https:") {
    return false;
  }
  const segments = pageUrl.pathname.split("/").filter(Boolean);
  const offset = isDocsLocale(segments[0]) ? 1 : 0;
  if (segments[offset] !== "docs") {
    return false;
  }

  const configuredOrigin = new URL(siteConfig.url).origin;
  if (pageUrl.origin === configuredOrigin) return true;

  return ["localhost", "127.0.0.1", "[::1]"].includes(pageUrl.hostname);
}

export async function submitDocsFeedback(
  input: PageFeedback,
): Promise<ActionResponse> {
  return submitFeedback(pageFeedback.parse(input));
}

export async function submitDocsBlockFeedback(
  input: BlockFeedback,
): Promise<ActionResponse> {
  return submitFeedback(blockFeedback.parse(input));
}

async function submitFeedback(feedback: DocsFeedback): Promise<ActionResponse> {
  const pageUrl = new URL(feedback.url);
  if (!isAllowedPageUrl(pageUrl)) {
    throw new Error("Feedback must come from the Ryu Docs site");
  }

  const fallback = fallbackUrl(feedback, pageUrl);
  const token = process.env.DOCS_FEEDBACK_GITHUB_TOKEN?.trim();
  if (!token) {
    return actionResponse.parse({
      destinationUrl: fallback,
      submitted: false,
    });
  }

  try {
    return actionResponse.parse({
      destinationUrl: await sendToGitHub(feedback, pageUrl, token),
      submitted: true,
    });
  } catch {
    return actionResponse.parse({
      destinationUrl: fallback,
      submitted: false,
    });
  }
}
