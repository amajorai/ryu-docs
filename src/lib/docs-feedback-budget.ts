import { createHash } from "node:crypto";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_SUBMISSIONS = 20;

/** Reserve before awaiting GitHub, including concurrent submissions and failures. */
export function createFeedbackBudget() {
  let resetsAt = 0;
  const submissions = new Set<string>();
  return (body: string, now = Date.now()): boolean => {
    if (now >= resetsAt) {
      submissions.clear();
      resetsAt = now + WINDOW_MS;
    }
    const key = createHash("sha256").update(body).digest("hex");
    if (submissions.has(key) || submissions.size >= MAX_SUBMISSIONS)
      return false;
    submissions.add(key);
    return true;
  };
}

let processBudget = createFeedbackBudget();

/** The process-wide budget the docs feedback action reserves from. */
export function reserveFeedbackSubmission(body: string, now?: number): boolean {
  return processBudget(body, now);
}

/** Test hook: start a fresh process-wide budget window. */
export function resetFeedbackBudget(): void {
  processBudget = createFeedbackBudget();
}
