import { expect, test } from "bun:test";
import { GET as security } from "./.well-known/security.txt/route";
import { GET as auth } from "./auth.md/route";
import { GET as alias } from "./security.txt/route";

test("docs discovery redirects to the canonical policy and authentication owners", () => {
  for (const handler of [security, alias]) {
    expect(handler().status).toBe(308);
    expect(handler().headers.get("location")).toBe(
      "https://ryuhq.com/.well-known/security.txt",
    );
  }
  expect(auth().status).toBe(308);
  expect(auth().headers.get("location")).toBe("https://ryuhq.com/auth.md");
});
