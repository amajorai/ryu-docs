import { expect, test } from "bun:test";

const pageUrl = new URL(
  "../../content/docs/extend/develop/sdk/language-bindings.mdx",
  import.meta.url,
);

test("language bindings docs describe every tested SDK project", async () => {
  const page = await Bun.file(pageUrl).text();
  expect(page).toContain("amajorai/ryu-sdk");
  expect(page).toContain(
    "public runtime repository,\n`amajorai/ryu`, does not carry the language-binding projects",
  );
  for (const language of [
    "Python",
    "Go",
    "C#",
    "Swift",
    "Kotlin",
    "Java",
    "React Native / Expo",
  ]) {
    expect(page).toContain(`## ${language}`);
  }
  for (const command of [
    "bindings/python/test.sh",
    "bindings/go/test.sh",
    "bindings/swift/test.sh",
    "bindings/kotlin/test.sh",
    "bindings/csharp/test.sh",
    "bindings/java/test.sh",
    "crates/sdk/napi && bun test",
  ]) {
    expect(page).toContain(command);
  }
  expect(page).toContain("The hub's CI runs each binding's\n`test.sh`");
  expect(page).not.toContain(".github/workflows/");
  expect(page).not.toContain("are planned");
});
