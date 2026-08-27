import { expect, test } from "bun:test";

const gettingStartedRoot = new URL(
  "../../content/docs/start-here/getting-started/",
  import.meta.url,
);

async function readPage(name: string): Promise<string> {
  return Bun.file(new URL(name, gettingStartedRoot)).text();
}

test("getting-started entry pages use direct setup language", async () => {
  const [entry, firstChat, runtimes, selfHost] = await Promise.all([
    readPage("index.mdx"),
    readPage("first-chat.mdx"),
    readPage("install-sidecar.mdx"),
    readPage("self-host.mdx"),
  ]);

  expect(entry).toContain("Install Ryu and run an agent.");
  expect(entry).toContain("The desktop app includes a chat interface");
  expect(firstChat).toContain("Ryu opens to Chat with the built-in");
  expect(runtimes).toContain("Ryu manages agent runtimes as **sidecars**.");
  expect(selfHost).toContain(
    "A self-hosted Ryu Node runs **Core** and **Gateway**",
  );

  for (const page of [entry, firstChat, runtimes, selfHost]) {
    expect(page).not.toContain("Agents are powerful. Using them shouldn't.");
  }
});
