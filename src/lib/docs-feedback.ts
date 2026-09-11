"use server";

import {
  type ActionResponse,
  actionResponse,
  type PageFeedback,
  pageFeedback,
} from "@/components/feedback/schema";
import { siteConfig } from "@/lib/metadata";

const DEFAULT_GITHUB_OWNER = "amajorai";
const DEFAULT_GITHUB_REPOSITORY = "ryu";
const FEEDBACK_EMAIL = "hello@ryuhq.com";

function feedbackBody(feedback: PageFeedback, pageUrl: URL): string {
  const opinion = feedback.opinion === "good" ? "Good" : "Needs improvement";

  return [
    "## Documentation feedback",
    "",
    `- Opinion: ${opinion}`,
    `- Page: ${pageUrl.href}`,
    "",
    feedback.message,
    "",
    "> Submitted from Ryu Docs.",
  ].join("\n");
}

function fallbackUrl(feedback: PageFeedback, pageUrl: URL): string {
  const params = new URLSearchParams({
    body: feedbackBody(feedback, pageUrl),
    subject: `Ryu Docs feedback: ${pageUrl.pathname}`,
  });

  return `mailto:${FEEDBACK_EMAIL}?${params.toString()}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function sendToGitHub(
  feedback: PageFeedback,
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
        title: `[Docs] ${pageUrl.pathname}`,
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
  if (pageUrl.pathname !== "/docs" && !pageUrl.pathname.startsWith("/docs/")) {
    return false;
  }

  const configuredOrigin = new URL(siteConfig.url).origin;
  if (pageUrl.origin === configuredOrigin) return true;

  return ["localhost", "127.0.0.1", "[::1]"].includes(pageUrl.hostname);
}

export async function submitDocsFeedback(
  input: PageFeedback,
): Promise<ActionResponse> {
  const feedback = pageFeedback.parse(input);
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
