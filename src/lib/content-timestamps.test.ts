import { expect, test } from "bun:test";
import { createContentTimestampReader } from "./content-timestamps";

test("missing or invalid source history never becomes a build timestamp", async () => {
  for (const value of ["", "invalid"]) {
    expect(
      await createContentTimestampReader(async () => value)("page"),
    ).toBeNull();
  }
  const read = createContentTimestampReader(async () => {
    throw new Error("No Git history");
  });
  expect(await read("page")).toBeNull();
});

test("bounds concurrent lookups, drains the queue, and preserves source dates", async () => {
  let active = 0;
  let peak = 0;
  const read = createContentTimestampReader(async () => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 1));
    active -= 1;
    return "2026-09-01T00:00:00Z";
  }, 2);
  const dates = await Promise.all(
    Array.from({ length: 12 }, (_, i) => read(`${i}`)),
  );
  expect(peak).toBe(2);
  expect(dates.map((date) => date?.toISOString())).toEqual(
    Array(12).fill("2026-09-01T00:00:00.000Z"),
  );
});
