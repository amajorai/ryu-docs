import { expect, test } from "bun:test";
import { renderExclusively } from "./mermaid-queue";

test("runs each render only after the previous one settles", async () => {
  const events: string[] = [];
  let finishFirst: (() => void) | undefined;
  const firstGate = new Promise<void>((resolve) => {
    finishFirst = resolve;
  });

  const first = renderExclusively(async () => {
    events.push("first:start");
    await firstGate;
    events.push("first:end");
    throw new Error("render failed");
  });
  const second = renderExclusively(() => {
    events.push("second:start");
    return Promise.resolve("second");
  });

  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(events).toEqual(["first:start"]);
  finishFirst?.();

  await expect(first).rejects.toThrow("render failed");
  expect(await second).toBe("second");
  expect(events).toEqual(["first:start", "first:end", "second:start"]);
});
