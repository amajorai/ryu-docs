import { expect, test } from "bun:test";
import { GET } from "./route";

test("section projection rejects inherited object names and unknown sections as 404", async () => {
  for (const section of [
    "constructor",
    "__proto__",
    "toString",
    "missing-section",
  ]) {
    await expect(
      GET(new Request(`https://docs.example/llms-sections/${section}`), {
        params: Promise.resolve({ section }),
      }),
    ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  }
});

test("section projection retains unsupported locale validation", async () => {
  const response = await GET(
    new Request("https://docs.example/llms-sections/extend?locale=invalid"),
    {
      params: Promise.resolve({ section: "extend" }),
    },
  );
  expect(response.status).toBe(400);
  expect(await response.text()).toBe("Unsupported documentation locale");
});
