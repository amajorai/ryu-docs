import { describe, expect, test } from "bun:test";

type Meta = {
  pages?: string[];
  root?: boolean;
};

const docsRoot = new URL("../../content/docs/", import.meta.url);

async function readMeta(path: string): Promise<Meta> {
  return (await Bun.file(new URL(path, docsRoot)).json()) as Meta;
}

describe("docs navigation", () => {
  test("keeps every top-level realm in the root navigation", async () => {
    const root = await readMeta("meta.json");
    const realms = [
      "start-here",
      "showcase",
      "surfaces",
      "mobile",
      "browser-extension",
      "hardware",
      "core",
      "gateway",
      "standalone",
      "providers",
      "ci",
      "extend",
      "ui",
      "apps",
      "programs",
      "plugins",
      "security",
      "legal",
      "billing",
      "reference",
      "learn",
      "roadmap",
    ];

    expect(root.pages).toEqual(realms);
    for (const realm of realms) {
      const meta = await readMeta(`${realm}/meta.json`);
      expect(meta.root).toBe(true);
    }
  });

  test("keeps the Providers root grouped by capability and provider family", async () => {
    const providers = await readMeta("providers/meta.json");

    expect(providers.root).toBe(true);
    expect(providers.pages).toEqual([
      "index",
      "---Capability layers---",
      "chat-and-models",
      "embeddings-and-reranking",
      "speech",
      "image-and-video",
      "document-extraction",
      "toolkits",
      "---Provider families---",
      "cloud",
      "openrouter",
      "local",
      "custom",
      "---Accounts and routing---",
      "byok",
      "routing",
    ]);
  });

  test("keeps mobile and browser as dedicated grouped roots", async () => {
    const root = await readMeta("meta.json");
    expect(root.pages).toContain("mobile");
    expect(root.pages).toContain("browser-extension");

    const mobile = await readMeta("mobile/meta.json");
    expect(mobile.root).toBe(true);
    expect(mobile.pages).toEqual([
      "index",
      "---Account and usage---",
      "billing-and-marketplace",
      "---On-device AI---",
      "models",
      "---Native capabilities---",
      "tools-and-privacy",
      "native-surfaces",
    ]);

    const browserExtension = await readMeta("browser-extension/meta.json");
    expect(browserExtension.root).toBe(true);
    expect(browserExtension.pages).toEqual([
      "index",
      "---Local AI---",
      "local-models",
      "---Browser capabilities---",
      "browser-tools",
    ]);
  });

  test("keeps standalone service guides together", async () => {
    const standalone = await readMeta("standalone/meta.json");

    expect(standalone.root).toBe(true);
    expect(standalone.pages).toEqual(["index", "notify", "mail"]);
  });

  test("publishes the browser WebMCP guide with the MCP server docs", async () => {
    const mcp = await readMeta("extend/mcp/meta.json");

    expect(mcp.pages).toContain("webmcp");
  });

  test("keeps language server plugins in their own section", async () => {
    const plugins = await readMeta("plugins/meta.json");
    const pages = plugins.pages ?? [];
    const languageServerHeader = pages.indexOf("---Language Servers---");
    const developerToolsHeader = pages.indexOf("---Developer Tools---");

    expect(languageServerHeader).toBeGreaterThan(-1);
    expect(developerToolsHeader).toBeGreaterThan(languageServerHeader);
    expect(pages.slice(languageServerHeader + 1, developerToolsHeader)).toEqual(
      [
        "clangd-lsp",
        "csharp-lsp",
        "gopls-lsp",
        "jdtls-lsp",
        "kotlin-lsp",
        "lua-lsp",
        "php-lsp",
        "pyright-lsp",
        "ruby-lsp",
        "rust-analyzer-lsp",
        "swift-lsp",
        "typescript-lsp",
      ],
    );
    expect(
      pages
        .slice(developerToolsHeader + 1)
        .some((page) => page.endsWith("-lsp")),
    ).toBe(false);
  });

  test("keeps the desktop subrealms available to the root selector", async () => {
    for (const realm of [
      "desktop",
      "desktop/user-guide",
      "desktop/engines",
      "desktop/productivity",
    ]) {
      const meta = await readMeta(`surfaces/${realm}/meta.json`);
      expect(meta.root).toBe(true);
    }
  });

  test("groups every billing page and includes Teams seats", async () => {
    const billing = await readMeta("billing/meta.json");
    const pages = billing.pages ?? [];

    expect(pages).toEqual([
      "index",
      "---Plans & access---",
      "hosted-agents",
      "limits",
      "trial-and-access",
      "plan-changes",
      "pricing-changelog",
      "---Credits & usage---",
      "credits",
      "metering",
      "notifications",
      "---Organizations---",
      "organization-access",
      "seats",
      "agent-inboxes",
      "merging-accounts",
    ]);
  });

  test("groups the public programs pages", async () => {
    const root = await readMeta("meta.json");
    const programs = await readMeta("programs/meta.json");

    expect(root.pages).toContain("programs");
    expect(programs.root).toBe(true);
    expect(programs.pages).toEqual([
      "index",
      "---Community & access---",
      "partner-program",
      "perks",
      "startups-and-students",
      "---Build & earn---",
      "sell-your-own-agents",
      "creator-program",
      "referrals",
    ]);
  });
});
