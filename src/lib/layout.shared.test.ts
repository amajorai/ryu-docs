import { describe, expect, test } from "bun:test";

import {
  baseOptions,
  MAIN_SITE_LABEL,
  MAIN_SITE_TAB,
  MAIN_SITE_URL,
} from "./layout.shared";

describe("shared Fumadocs navigation", () => {
  test("links the header and root selector back to the main site", () => {
    const options = baseOptions();

    expect(options.nav?.url).toBe(MAIN_SITE_URL);
    expect(options.nav?.children).toBeDefined();
    expect(MAIN_SITE_TAB).toMatchObject({
      title: MAIN_SITE_LABEL,
      url: MAIN_SITE_URL,
    });
    expect(MAIN_SITE_TAB.props?.["aria-label"]).toBe("Open the Ryu main site");
  });
});
