import { expect, test } from "bun:test";

import { source } from "@/lib/source";
import { GET } from "./route";

const PAGE_DELIMITER = "\n\n--- END OF PAGE ---\n\n";

test("llms-full.txt keeps every English page except release notes and points at the compact indexes", async () => {
  const response = await GET(new Request("https://docs.example/llms-full.txt"));
  const body = await response.text();
  // Release notes are served by /llms-sections/release-notes, not the full-text file.
  const pages = source
    .getPages("en")
    .filter((page) => page.slugs[0] !== "release-notes");

  expect(response.status).toBe(200);
  expect(body).toContain(`Total pages: ${pages.length}`);
  expect(body.split(PAGE_DELIMITER)).toHaveLength(pages.length);
  for (const page of pages.slice(0, 50)) {
    expect(body).toContain(`Title: ${page.data.title}`);
  }
  expect(body).toContain("GET /llms/{folder}.txt");
}, 120_000);
