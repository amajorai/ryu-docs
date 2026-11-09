"use client";

import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { usePathname } from "next/navigation";
import { type FormEvent, useEffect, useState, useTransition } from "react";

import { cn } from "@/lib/cn";
import {
  DOCS_FEEDBACK_COPY,
  type DocsFeedbackCopy,
} from "@/lib/docs-feedback-copy";
import styles from "./feedback.module.css";

import {
  type ActionResponse,
  actionResponse,
  type PageFeedback,
  type StoredSubmission,
  storedSubmission,
} from "./schema";

type FeedbackProps = {
  /** The route's copy; English when omitted (e.g. the /proof page). */
  copy?: DocsFeedbackCopy;
  onSendAction: (feedback: PageFeedback) => Promise<ActionResponse>;
};

function readStoredSubmission(storageKey: string): StoredSubmission | null {
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return null;

    const parsed: unknown = JSON.parse(stored);
    const result = storedSubmission.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function saveStoredSubmission(
  storageKey: string,
  submission: StoredSubmission | null,
) {
  try {
    if (submission) {
      window.localStorage.setItem(storageKey, JSON.stringify(submission));
    } else {
      window.localStorage.removeItem(storageKey);
    }
  } catch {
    // A blocked or full localStorage must not prevent feedback from submitting.
  }
}

function isExternalUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

export function Feedback({
  copy = DOCS_FEEDBACK_COPY.en,
  onSendAction,
}: FeedbackProps) {
  const pathname = usePathname();
  const storageKey = `ryu-docs-feedback:${pathname}`;
  const [previous, setPrevious] = useState<StoredSubmission | null>(null);
  const [opinion, setOpinion] = useState<PageFeedback["opinion"] | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setPrevious(readStoredSubmission(storageKey));
  }, [storageKey]);

  const activeOpinion = previous?.feedback.opinion ?? opinion;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!opinion || !message.trim() || isPending) return;

    const feedback: PageFeedback = {
      message: message.trim(),
      opinion,
      url: window.location.href,
    };

    startTransition(async () => {
      try {
        const response = actionResponse.parse(await onSendAction(feedback));
        const submission = { feedback, response };

        saveStoredSubmission(storageKey, submission);
        setPrevious(submission);
        setMessage("");
        setOpinion(null);
        setError(null);
      } catch {
        setError(copy.sendError);
      }
    });
  }

  function reset() {
    saveStoredSubmission(storageKey, null);
    setPrevious(null);
    setError(null);
    setMessage("");
  }

  return (
    <section
      aria-labelledby="docs-feedback-title"
      className={cn(styles.root, "mt-10 rounded-2xl bg-fd-muted/60 p-4 sm:p-5")}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 id="docs-feedback-title" className="text-sm font-medium">
            {copy.title}
          </h2>
          <p className="mt-1 text-sm text-fd-muted-foreground">
            {copy.subtitle}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={activeOpinion === "good"}
            disabled={previous !== null || isPending}
            className={cn(
              buttonVariants({
                color: activeOpinion === "good" ? "primary" : "secondary",
                size: "sm",
              }),
              "gap-1.5 rounded-full touch-manipulation",
            )}
            onClick={() => {
              setOpinion("good");
              setError(null);
            }}
          >
            <ThumbsUp aria-hidden="true" className="size-4" />
            {copy.good}
          </button>
          <button
            type="button"
            aria-pressed={activeOpinion === "bad"}
            disabled={previous !== null || isPending}
            className={cn(
              buttonVariants({
                color: activeOpinion === "bad" ? "primary" : "secondary",
                size: "sm",
              }),
              "gap-1.5 rounded-full touch-manipulation",
            )}
            onClick={() => {
              setOpinion("bad");
              setError(null);
            }}
          >
            <ThumbsDown aria-hidden="true" className="size-4" />
            {copy.bad}
          </button>
        </div>
      </div>

      {previous ? (
        <div
          aria-live="polite"
          className="mt-4 flex flex-col gap-3 rounded-xl bg-fd-card p-4 text-sm text-fd-muted-foreground sm:flex-row sm:items-center sm:justify-between"
        >
          <p>{previous.response.submitted ? copy.sent : copy.ready}</p>
          <div className="flex flex-wrap gap-2">
            <a
              href={previous.response.destinationUrl}
              {...(isExternalUrl(previous.response.destinationUrl)
                ? { rel: "noopener noreferrer", target: "_blank" }
                : {})}
              className={cn(
                buttonVariants({
                  color: "secondary",
                  size: "sm",
                }),
                "touch-manipulation",
              )}
            >
              {previous.response.submitted
                ? copy.viewFeedback
                : copy.openEmailDraft}
            </a>
            <button
              type="button"
              className={cn(
                buttonVariants({
                  color: "ghost",
                  size: "sm",
                }),
                "touch-manipulation",
              )}
              onClick={reset}
            >
              {copy.submitAgain}
            </button>
          </div>
        </div>
      ) : opinion ? (
        <form className="mt-4 flex flex-col gap-3" onSubmit={submit}>
          <label
            htmlFor="docs-feedback-message"
            className="text-sm font-medium"
          >
            {copy.improvePrompt}
          </label>
          <textarea
            id="docs-feedback-message"
            name="message"
            required
            maxLength={2_000}
            rows={4}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={copy.placeholder}
            className="w-full resize-y rounded-xl bg-fd-secondary p-3 text-sm text-fd-secondary-foreground placeholder:text-fd-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
          />
          {error ? (
            <p
              role="alert"
              aria-live="polite"
              className="text-sm text-feedback-error"
            >
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-fd-muted-foreground">
              {message.length}/2,000
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className={cn(
                  buttonVariants({ color: "ghost", size: "sm" }),
                  "touch-manipulation",
                )}
                onClick={() => {
                  setOpinion(null);
                  setError(null);
                }}
              >
                {copy.cancel}
              </button>
              <button
                type="submit"
                disabled={isPending}
                className={cn(
                  buttonVariants({ color: "primary", size: "sm" }),
                  "touch-manipulation",
                )}
              >
                {isPending ? copy.sending : copy.submit}
              </button>
            </div>
          </div>
        </form>
      ) : null}
    </section>
  );
}
