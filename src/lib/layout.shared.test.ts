import { describe, expect, test } from "bun:test";

import { baseOptions, MAIN_SITE_URL } from "./layout.shared";

describe("shared Fumadocs navigation", () => {
  test("links the header back to the main site", () => {
    const options = baseOptions();

    expect(options.nav?.url).toBe(MAIN_SITE_URL);
    expect(options.nav?.children).toBeDefined();
  });
});
