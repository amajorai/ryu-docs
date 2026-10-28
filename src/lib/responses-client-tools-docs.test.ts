import { expect, test } from "bun:test";

test("Responses client tool documentation keeps hosted search permission and cache boundaries explicit", async () => {
  const page = await Bun.file(
    new URL(
      "../../content/docs/gateway/configuration-access.mdx",
      import.meta.url,
    ),
  ).text();
  expect(page).toContain("tool namespaces");
  expect(page).toContain("text custom tools");
  expect(page).toContain(
    "Lark grammar constraints are rejected before model inference",
  );
  expect(page).toContain("separate web-search permission");
  expect(page).toContain("does not grant that permission");
  expect(page).toContain("never");
  expect(page).toContain("no cached-search");
});

test("OpenAI integration guide matches the Responses hosted-search contract", async () => {
  const page = await Bun.file(
    new URL(
      "../../content/docs/extend/integrate/openai-compat.mdx",
      import.meta.url,
    ),
  )
    .text()
    .then((text) => text.replace(/\s+/g, " "));
  expect(page).toContain("tool namespaces");
  expect(page).toContain("text custom tools");
  expect(page).toContain("separate web-search permission");
  expect(page).toContain("An inference grant does not include that permission");
  expect(page).toContain("never live search");
  expect(page).toContain("no cached-search");
  expect(page).toContain(
    "Lark grammar constraints (rejected before model inference)",
  );
  expect(page).not.toContain("not OpenAI-hosted tools such as web search");
});
