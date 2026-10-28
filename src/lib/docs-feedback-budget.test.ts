import { expect, test } from "bun:test";
import { createFeedbackBudget } from "./docs-feedback-budget";

test("replays reserve one outbound submission and unique submissions are bounded", async () => {
  const reserve = createFeedbackBudget();
  const concurrent = await Promise.all(
    Array.from({ length: 100 }, () =>
      Promise.resolve(reserve("same feedback", 1)),
    ),
  );
  expect(concurrent.filter(Boolean)).toHaveLength(1);
  for (let index = 0; index < 19; index++)
    expect(reserve(`feedback ${index}`, 1)).toBe(true);
  expect(reserve("over budget", 1)).toBe(false);
  expect(reserve("same feedback", 3_600_001)).toBe(true);
});
