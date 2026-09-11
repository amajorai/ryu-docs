import { expect, test } from "bun:test";
import robots from "./robots";

test("all advertised crawler groups can read documentation preview images", () => {
  const result = robots();
  const rules = result.rules;
  if (!Array.isArray(rules)) throw new Error("Expected crawler rule groups");
  for (const rule of rules) {
    expect(rule.allow).toBe("/");
    expect(rule.disallow).toEqual(["/api/"]);
  }
  expect(result.sitemap).toBe("https://docs.ryuhq.com/sitemap.xml");
});
