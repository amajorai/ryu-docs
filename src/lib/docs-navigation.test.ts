import { describe, expect, test } from "bun:test";

import { readMeta, readPage } from "./docs-navigation-helpers";

describe("docs navigation", () => {
  test("keeps every top-level realm in the root navigation", async () => {
    const root = await readMeta("meta.json");
    // Newcomer order: get started, use Ryu, catalogs, platform, build and
    // extend, reference, account and trust, then what changed and what's next.
    const realms = [
      "start-here",
      "learn",
      "surfaces",
      "mobile",
      "browser-extension",
      "hardware",
      "apps",
      "plugins",
      "providers",
      "core",
      "gateway",
      "security",
      "extend",
      "ui",
      "standalone",
      "ci",
      "showcase",
      "reference",
      "billing",
      "programs",
      "legal",
      "release-notes",
      "roadmap",
      "rsi",
    ];

    expect(root.pages).toEqual(realms);
    for (const realm of realms) {
      const meta = await readMeta(`${realm}/meta.json`);
      expect(meta.root).toBe(true);
    }
  });

  test("publishes the recursive improvement section as a complete guide set", async () => {
    const rsi = await readMeta("rsi/meta.json");
    const pages = [
      "index",
      "operating-model",
      "learning-loop",
      "experiment-loop",
      "self-building",
      "guardrails",
      "roadmap",
    ];

    expect(rsi.root).toBe(true);
    expect(rsi.pages).toEqual([
      "index",
      "---Operating model---",
      "operating-model",
      "learning-loop",
      "experiment-loop",
      "self-building",
      "---Safety & adoption---",
      "guardrails",
      "roadmap",
    ]);

    for (const page of pages) {
      await readPage(`rsi/${page}.mdx`);
    }
  });

  test("keeps the Providers root grouped by capability and provider family", async () => {
    const providers = await readMeta("providers/meta.json");

    expect(providers.root).toBe(true);
    expect(providers.pages).toEqual([
      "index",
      "---Get started---",
      "manage-providers",
      "byok",
      "inventory",
      "---Capability layers---",
      "chat-and-models",
      "embeddings-and-reranking",
      "speech",
      "image-and-video",
      "image-video-provider-guides",
      "document-extraction",
      "toolkits",
      "---Provider families---",
      "cloud",
      "openrouter",
      "prompt-caching",
      "upstream-routers",
      "local",
      "custom",
      "---Routing---",
      "routing",
      "account-routing",
      "provider-pools",
      "---Subscription accounts---",
      "chatgpt-plan",
      "codex-reset-planning",
      "native-kiro-accounts",
      "kiro",
      "qoder",
    ]);
    await readPage("providers/native-kiro-accounts.mdx");
    await readPage("providers/kiro.mdx");
  });

  test("keeps mobile and browser as dedicated grouped roots", async () => {
    const root = await readMeta("meta.json");
    expect(root.pages).toContain("mobile");
    expect(root.pages).toContain("browser-extension");

    const mobile = await readMeta("mobile/meta.json");
    expect(mobile.root).toBe(true);
    expect(mobile.pages).toEqual([
      "index",
      "---Get started---",
      "connect-and-sign-in",
      "navigation-and-settings",
      "devices-and-layout",
      "---Use Ryu Mobile---",
      "chats-and-spaces",
      "agents",
      "billing-and-marketplace",
      "---On-device AI---",
      "models",
      "tools-and-privacy",
      "---Native surfaces---",
      "native-surfaces",
      "watch-and-car",
      "ai-keyboard",
      "---Ryu Bot---",
      "bot",
    ]);

    const browserExtension = await readMeta("browser-extension/meta.json");
    expect(browserExtension.root).toBe(true);
    expect(browserExtension.pages).toEqual([
      "index",
      "---Use the extension---",
      "popup-and-new-tab",
      "copilot",
      "search",
      "notifications",
      "---Local AI and browser tools---",
      "local-models",
      "browser-tools",
      "---Accounts and connection---",
      "accounts",
      "connection-and-updates",
    ]);
  });

  test("keeps standalone service guides together", async () => {
    const standalone = await readMeta("standalone/meta.json");

    expect(standalone.root).toBe(true);
    expect(standalone.pages).toEqual([
      "index",
      "---Ryu Gateway---",
      "gateway",
      "gateway-api",
      "---Ryu Passport---",
      "passport",
      "passport-api",
      "passport-fetch-api",
      "passport-mcp-api",
      "---Ryu Connect---",
      "connect",
      "connect-configuration",
      "connect-cli",
      "connect-api",
      "connect-api-routes",
      "connect-api-mcp",
      "connect-api-access-policy",
      "---Connect tools and catalog---",
      "connect-api-discovery",
      "connect-api-catalog",
      "connect-api-composio",
      "connect-api-native-toolkits",
      "connect-api-relay",
      "connect-api-composed",
      "connect-api-routing",
      "---Connect triggers and tasks---",
      "connect-api-triggers",
      "connect-api-trigger-events",
      "connect-api-tasks",
      "connect-api-media",
      "---Connect billing and reviews---",
      "connect-api-billing",
      "connect-api-usage",
      "connect-api-tags",
      "connect-api-reviews",
      "---Ryu Box---",
      "box",
      "box-api",
      "box-lifecycle",
      "---Ryu Mail---",
      "mail",
      "mail-api",
      "mail-api-webhooks",
      "mail-api-realtime",
      "mail-delivery",
      "---Ryu Messaging---",
      "messaging",
      "messaging-api",
      "messaging-numbers",
      "---Ryu Notify---",
      "notify",
      "notify-api",
      "notify-streams",
      "notify-parity",
      "---Ryu Sites---",
      "sites",
      "sites-api",
      "---Ryu Managed Agents and Hire---",
      "managed-agents",
      "managed-agents-api",
      "managed-agents-api-requests",
      "managed-agents-api-resources",
      "managed-agents-api-examples",
      "managed-agents-events",
      "hire",
      "---SDK, CLI and MCP---",
      "sdk",
    ]);
  });

  test("publishes the Video Studio workflow guides beside the app overview", async () => {
    const apps = await readMeta("apps/meta.json");
    expect(apps.pages).toEqual(
      expect.arrayContaining([
        "video-studio",
        "video-studio-editing",
        "video-studio-generation",
        "video-studio-transcription",
      ]),
    );
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

  test("nests desktop guides under the Desktop App root", async () => {
    const desktop = await readMeta("surfaces/desktop/meta.json");
    expect(desktop.root).toBe(true);
    expect(desktop.pages).toEqual(
      expect.arrayContaining(["user-guide", "engines", "productivity"]),
    );

    for (const realm of [
      "desktop/user-guide",
      "desktop/engines",
      "desktop/productivity",
    ]) {
      const meta = await readMeta(`surfaces/${realm}/meta.json`);
      expect(meta.root).not.toBe(true);
      expect(meta.icon).toBeString();
    }
  });

  test("lists the extension and SDK guides through their own folder lists", async () => {
    const develop = (await readMeta("extend/develop/meta.json")).pages ?? [];
    expect(develop).toEqual(expect.arrayContaining(["extensions", "sdk"]));
    expect(
      develop.filter(
        (page) => page.startsWith("extensions/") || page.startsWith("sdk/"),
      ),
    ).toEqual([]);

    const sdk = (await readMeta("extend/develop/sdk/meta.json")).pages ?? [];
    expect(sdk[0]).toBe("index");
  });
});
