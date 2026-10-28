import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

const providers = fileURLToPath(
  new URL("../../content/docs/providers/", import.meta.url),
);

async function readProse(name: string): Promise<string> {
  const text = await Bun.file(`${providers}/${name}`).text();
  return text.replace(/\s+/g, " ");
}

test("managed Pi OAuth docs state account affinity and the supported routing boundary", async () => {
  // Account binding, refresh, and strategies are single-sourced on the
  // Account Routing page; BYOK and Provider Routing link to it.
  const accountRouting = await readProse("account-routing.mdx");
  const byok = await readProse("byok.mdx");
  const routing = await readProse("routing.mdx");

  for (const page of [byok, routing]) {
    expect(page).toContain("/docs/providers/account-routing");
  }

  for (const provider of [
    "GitHub Copilot",
    "Kimi Code",
    "OpenAI Codex",
    "Radius",
    "OpenRouter",
    "xAI",
  ]) {
    expect(accountRouting).toContain(provider);
  }
  expect(accountRouting).toContain("authentication error");
  expect(accountRouting).toContain("Manual");
  expect(accountRouting).toContain("Round robin");
  expect(accountRouting).toContain("Fill first");
  expect(accountRouting).toContain("priority");
  expect(accountRouting).toContain("real expiration time");
  expect(accountRouting).toContain("binding persists across restarts");
  expect(accountRouting).toContain("renewable credentials stay in");
  expect(accountRouting).toContain("replay a whole");
  expect(accountRouting).toContain("API-key accounts");
  expect(accountRouting).toContain("model catalogs cannot replace");
  expect(accountRouting).toContain("quota_observations_supported");
  expect(accountRouting).toContain(
    "configured model for dispatch and usage attribution",
  );
  expect(accountRouting).toContain(
    "missing input or output token counts as missing",
  );
  expect(accountRouting).toContain(
    "does not infer the split from context usage",
  );
});
