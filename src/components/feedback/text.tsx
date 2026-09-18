"use client";

import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { MessageSquare, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import { cn } from "@/lib/cn";

import {
  type ActionResponse,
  actionResponse,
  type BlockFeedback,
  type StoredBlockSubmission,
  storedBlockSubmission,
} from "./schema";

const MAX_EXCERPT_LENGTH = 220;
const MAX_SELECTION_LENGTH = 2_000;
const MAX_BLOCK_BODY_LENGTH = 4_000;
const POPOVER_WIDTH = 352;
const POPOVER_HEIGHT = 260;

type FeedbackTextProps = {
  children: ReactNode;
  onSendAction: (feedback: BlockFeedback) => Promise<ActionResponse>;
};

type SelectionTarget = {
  blockBody: string;
  blockId: string;
  excerpt: string;
  left: number;
  top: number;
};

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function feedbackBlock(node: Node | null): HTMLElement | null {
  if (!node) return null;
  const element =
    node instanceof HTMLElement ? node : (node.parentElement ?? null);
  return element?.closest<HTMLElement>('[data-block="feedback"]') ?? null;
}

function readSelectionTarget(): SelectionTarget | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return null;
  }

  const selectedText = normalizeText(selection.toString());
  if (!selectedText || selectedText.length > MAX_SELECTION_LENGTH) {
    return null;
  }

  const anchorBlock = feedbackBlock(selection.anchorNode);
  const focusBlock = feedbackBlock(selection.focusNode);
  if (!anchorBlock || anchorBlock !== focusBlock) return null;

  const blockId = anchorBlock.getAttribute("id")?.trim();
  const blockBody = normalizeText(
    anchorBlock.innerText || anchorBlock.textContent || "",
  ).slice(0, MAX_BLOCK_BODY_LENGTH);
  if (!blockId || !blockBody) return null;

  const rect = selection.getRangeAt(0).getBoundingClientRect();
  const maxLeft = Math.max(12, window.innerWidth - POPOVER_WIDTH - 12);
  const left = Math.min(
    Math.max(12, rect.left + rect.width / 2 - POPOVER_WIDTH / 2),
    maxLeft,
  );
  const maxTop = Math.max(12, window.innerHeight - POPOVER_HEIGHT - 12);
  const below = rect.bottom + 12;
  const top =
    below <= maxTop ? below : Math.max(12, rect.top - POPOVER_HEIGHT - 12);

  return {
    blockBody,
    blockId,
    excerpt:
      selectedText.length > MAX_EXCERPT_LENGTH
        ? `${selectedText.slice(0, MAX_EXCERPT_LENGTH - 1)}…`
        : selectedText,
    left,
    top,
  };
}

function storageKey(pathname: string, blockId: string): string {
  return `ryu-docs-block-feedback:${pathname}:${blockId}`;
}

function readStoredSubmission(key: string): StoredBlockSubmission | null {
  try {
    const value = window.localStorage.getItem(key);
    if (!value) return null;

    const result = storedBlockSubmission.safeParse(JSON.parse(value));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function saveStoredSubmission(
  key: string,
  submission: StoredBlockSubmission | null,
) {
  try {
    if (submission) {
      window.localStorage.setItem(key, JSON.stringify(submission));
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // A blocked or full localStorage must not prevent feedback from submitting.
  }
}

function isDomNode(value: EventTarget | null): value is Node {
  return typeof Node !== "undefined" && value instanceof Node;
}

function isExternalUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

export function FeedbackText({ children, onSendAction }: FeedbackTextProps) {
  const pathname = usePathname();
  const popoverRef = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<SelectionTarget | null>(null);
  const [submission, setSubmission] = useState<StoredBlockSubmission | null>(
    null,
  );
  const [opinion, setOpinion] = useState<BlockFeedback["opinion"] | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let selectionTimer: number | undefined;

    function showSelection() {
      const next = readSelectionTarget();
      if (!next) return;

      setTarget(next);
      setSubmission(readStoredSubmission(storageKey(pathname, next.blockId)));
      setOpinion(null);
      setMessage("");
      setError(null);
    }

    function onSelectionEnd() {
      if (selectionTimer !== undefined) {
        window.clearTimeout(selectionTimer);
      }
      selectionTimer = window.setTimeout(showSelection, 0);
    }

    function onPointerDown(event: PointerEvent) {
      if (!isDomNode(event.target)) return;
      if (popoverRef.current?.contains(event.target)) return;
      if (feedbackBlock(event.target)) return;
      setTarget(null);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setTarget(null);
    }

    function onScroll() {
      setTarget(null);
    }

    document.addEventListener("mouseup", onSelectionEnd);
    document.addEventListener("touchend", onSelectionEnd);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);

    return () => {
      if (selectionTimer !== undefined) {
        window.clearTimeout(selectionTimer);
      }
      document.removeEventListener("mouseup", onSelectionEnd);
      document.removeEventListener("touchend", onSelectionEnd);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [pathname]);

  function close() {
    setTarget(null);
    setOpinion(null);
    setMessage("");
    setError(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!target || !opinion || !message.trim() || isPending) return;

    const currentTarget = target;
    const currentStorageKey = storageKey(pathname, currentTarget.blockId);
    const feedback: BlockFeedback = {
      blockBody: currentTarget.blockBody,
      blockId: currentTarget.blockId,
      message: message.trim(),
      opinion,
      url: window.location.href,
    };

    startTransition(async () => {
      try {
        const response = actionResponse.parse(await onSendAction(feedback));
        const nextSubmission = { feedback, response };

        saveStoredSubmission(currentStorageKey, nextSubmission);
        setSubmission(nextSubmission);
        setOpinion(null);
        setMessage("");
        setError(null);
      } catch {
        setError("We couldn’t send that feedback. Please try again.");
      }
    });
  }

  function submitAgain() {
    if (!target) return;
    saveStoredSubmission(storageKey(pathname, target.blockId), null);
    setSubmission(null);
    setOpinion(null);
    setMessage("");
    setError(null);
  }

  return (
    <>
      {children}
      {target ? (
        <div
          ref={popoverRef}
          aria-label="Feedback on selected documentation"
          className="not-prose fixed z-50 w-full max-w-sm rounded-2xl bg-fd-popover p-4 text-fd-popover-foreground shadow-xl"
          data-feedback-popover="true"
          role="dialog"
          style={{
            left: target.left,
            top: target.top,
            width: "min(22rem, calc(100vw - 1.5rem))",
          }}
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-xs font-medium text-fd-muted-foreground">
                <MessageSquare aria-hidden="true" className="size-3.5" />
                Feedback on this section
              </p>
              <p className="mt-1 line-clamp-3 text-sm">“{target.excerpt}”</p>
            </div>
            <button
              type="button"
              aria-label="Close block feedback"
              className={cn(
                buttonVariants({ color: "ghost", size: "sm" }),
                "size-8 shrink-0 p-0 touch-manipulation",
              )}
              onClick={close}
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>

          {submission ? (
            <div
              aria-live="polite"
              className="mt-4 rounded-xl bg-fd-muted p-3 text-sm text-fd-muted-foreground"
            >
              <p>
                {submission.response.submitted
                  ? "Thanks - your feedback was sent."
                  : "Thanks - your feedback is ready to send."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={submission.response.destinationUrl}
                  {...(isExternalUrl(submission.response.destinationUrl)
                    ? { rel: "noopener noreferrer", target: "_blank" }
                    : {})}
                  className={cn(
                    buttonVariants({ color: "secondary", size: "sm" }),
                    "touch-manipulation",
                  )}
                >
                  {submission.response.submitted
                    ? "View feedback"
                    : "Open email draft"}
                </a>
                <button
                  type="button"
                  className={cn(
                    buttonVariants({ color: "ghost", size: "sm" }),
                    "touch-manipulation",
                  )}
                  onClick={submitAgain}
                >
                  Submit again
                </button>
              </div>
            </div>
          ) : opinion ? (
            <form className="mt-4 flex flex-col gap-3" onSubmit={submit}>
              <label
                htmlFor="docs-block-feedback-message"
                className="text-sm font-medium"
              >
                What should change?
              </label>
              <textarea
                id="docs-block-feedback-message"
                name="message"
                required
                maxLength={2_000}
                rows={3}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Leave feedback…"
                className="w-full resize-y rounded-xl bg-fd-secondary p-3 text-sm text-fd-secondary-foreground placeholder:text-fd-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
              />
              {error ? (
                <p
                  role="alert"
                  aria-live="polite"
                  className="text-sm text-red-600 dark:text-red-300"
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
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className={cn(
                      buttonVariants({ color: "primary", size: "sm" }),
                      "touch-manipulation",
                    )}
                  >
                    {isPending ? "Sending…" : "Submit feedback"}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-label="Mark this section as helpful"
                  className={cn(
                    buttonVariants({ color: "secondary", size: "sm" }),
                    "gap-1.5 rounded-full touch-manipulation",
                  )}
                  onClick={() => {
                    setOpinion("good");
                    setError(null);
                  }}
                >
                  <ThumbsUp aria-hidden="true" className="size-4" />
                  Helpful
                </button>
                <button
                  type="button"
                  aria-label="Suggest an improvement for this section"
                  className={cn(
                    buttonVariants({ color: "secondary", size: "sm" }),
                    "gap-1.5 rounded-full touch-manipulation",
                  )}
                  onClick={() => {
                    setOpinion("bad");
                    setError(null);
                  }}
                >
                  <ThumbsDown aria-hidden="true" className="size-4" />
                  Needs work
                </button>
              </div>
              <p className="mt-2 text-xs text-fd-muted-foreground">
                Select a rating to add a note for the Ryu Docs team.
              </p>
            </>
          )}
        </div>
      ) : null}
    </>
  );
}
