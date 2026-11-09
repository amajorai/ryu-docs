import { expect, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";

import { SearchTrigger } from "./search-trigger";

test("search trigger aligns its label with logical utilities so it mirrors under RTL", () => {
  const markup = renderToStaticMarkup(<SearchTrigger />);
  const buttonClass = /<button[^>]*class="([^"]*)"/.exec(markup)?.[1] ?? "";
  const classes = buttonClass.split(/\s+/);

  expect(classes).toContain("text-start");
  expect(classes).not.toContain("text-left");
  expect(classes).not.toContain("text-right");
});
