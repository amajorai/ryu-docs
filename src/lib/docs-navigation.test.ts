import { describe, expect, test } from "bun:test";

type Meta = {
  icon?: string;
  pages?: string[];
  root?: boolean;
};

const docsRoot = new URL("../../content/docs/", import.meta.url);
const docsRootPath = docsRoot.pathname;
const internalMarkdownLink = /\[[^\]]+\]\((\/docs(?:\/[^)\s]+)?)\)/g;
const versionSegment = /^\d+\.\d+\.\d+$/;

async function readMeta(path: string): Promise<Meta> {
  return (await Bun.file(new URL(path, docsRoot)).json()) as Meta;
}

async function readPage(path: string): Promise<string> {
  return Bun.file(new URL(path, docsRoot)).text();
}

function normalizeDocsHref(href: string): string {
  const pathname = href.split(/[?#]/, 1)[0] ?? href;
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] !== "docs") {
    return pathname;
  }

  if (versionSegment.test(segments[1] ?? "")) {
    segments.splice(1, 1);
  }

  return segments.length === 1 ? "/docs" : `/${segments.join("/")}`;
}

async function readDocFiles(): Promise<string[]> {
  const files: string[] = [];
  const glob = new Bun.Glob("**/*.mdx");

  for await (const file of glob.scan({ cwd: docsRootPath })) {
    files.push(file);
  }

  return files.sort();
}

function pagePathFromFile(file: string): string {
  const withoutExtension = file.replace(/\.mdx$/, "");
  const withoutIndex = withoutExtension.replace(/\/index$/, "");
  return withoutIndex ? `/docs/${withoutIndex}` : "/docs";
}

function pagesUnderHeader(
  pages: string[],
  header: string,
  nextHeader?: string,
): string[] {
  const start = pages.indexOf(header);
  const end = nextHeader ? pages.indexOf(nextHeader) : pages.length;

  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`Missing sidebar section: ${header}`);
  }

  return pages.slice(start + 1, end);
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
    expect(standalone.pages).toEqual([
      "index",
      "---Ryu Gateway---",
      "gateway",
      "gateway-api",
      "---Ryu Box---",
      "box",
      "box-api",
      "box-lifecycle",
      "---Ryu Mail---",
      "mail",
      "mail-api",
      "mail-delivery",
      "---Ryu Notify---",
      "notify",
      "notify-api",
      "notify-streams",
      "---Ryu Hire---",
      "hire",
    ]);
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

  test("keeps long guides split under their existing sidebar sections", async () => {
    const sections = [
      {
        meta: "surfaces/desktop/user-guide/meta.json",
        header: "---Chat & agents---",
        nextHeader: "---Knowledge & tools---",
        pages: [
          "chat",
          "chat-basics",
          "chat-sessions",
          "chat-messages",
          "chat-session-controls",
          "chat-composer-and-media",
        ],
      },
      {
        meta: "gateway/meta.json",
        header: "---Configuration & Security---",
        nextHeader: "---Tools & Channels---",
        pages: [
          "configuration",
          "configuration-settings",
          "configuration-access",
          "configuration-operations",
          "configuration-api",
        ],
      },
      {
        meta: "gateway/meta.json",
        header: "---Tools & Channels---",
        nextHeader: "---Observability & Reliability---",
        pages: [
          "channels",
          "channel-setup",
          "channel-controls",
          "channel-routing",
        ],
      },
      {
        meta: "security/meta.json",
        header: "---Access Control---",
        nextHeader: "---Isolation---",
        pages: [
          "authentication-and-pairing",
          "authentication-account",
          "authentication-devices",
          "authentication-mcp",
          "authentication-organizations",
          "authentication-tokens",
        ],
      },
      {
        meta: "extend/develop/meta.json",
        header: "---TypeScript SDK---",
        nextHeader: "---Rust SDK---",
        pages: ["sdk/index", "sdk/runnables", "sdk/builders", "sdk/tooling"],
      },
    ];

    for (const section of sections) {
      const navigation = (await readMeta(section.meta)).pages ?? [];
      expect(
        pagesUnderHeader(navigation, section.header, section.nextHeader),
      ).toEqual(expect.arrayContaining(section.pages));
    }

    const compactGuides = [
      "surfaces/desktop/user-guide/chat.mdx",
      "surfaces/desktop/user-guide/chat-basics.mdx",
      "surfaces/desktop/user-guide/chat-sessions.mdx",
      "surfaces/desktop/user-guide/chat-messages.mdx",
      "surfaces/desktop/user-guide/chat-session-controls.mdx",
      "surfaces/desktop/user-guide/chat-composer-and-media.mdx",
      "gateway/configuration.mdx",
      "gateway/configuration-settings.mdx",
      "gateway/configuration-access.mdx",
      "gateway/configuration-operations.mdx",
      "gateway/configuration-api.mdx",
      "gateway/channels.mdx",
      "gateway/channel-setup.mdx",
      "gateway/channel-controls.mdx",
      "gateway/channel-routing.mdx",
      "security/authentication-and-pairing.mdx",
      "security/authentication-account.mdx",
      "security/authentication-devices.mdx",
      "security/authentication-mcp.mdx",
      "security/authentication-organizations.mdx",
      "security/authentication-tokens.mdx",
      "extend/develop/sdk/index.mdx",
      "extend/develop/sdk/runnables.mdx",
      "extend/develop/sdk/builders.mdx",
      "extend/develop/sdk/tooling.mdx",
    ];

    for (const guide of compactGuides) {
      const content = await readPage(guide);
      expect(content.split(/\r?\n/).length).toBeLessThan(500);
    }
  });

  test("keeps generated API roots as directories of endpoint groups", async () => {
    const coreIndex = await readPage(
      "extend/develop/api-reference/core/index.mdx",
    );
    const agentsIndex = await readPage(
      "extend/develop/api-reference/core/agents/index.mdx",
    );

    expect(coreIndex.split(/\r?\n/).length).toBeLessThan(120);
    expect(coreIndex).toContain("Browse by endpoint group");
    expect(agentsIndex).toContain("<Cards>");
    expect(agentsIndex).toContain("core/agents/list_agents");
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
      "challenges",
      "referrals",
    ]);
  });

  test("keeps every public page connected by valid inline documentation links", async () => {
    const files = await readDocFiles();
    const pagePaths = new Set(files.map(pagePathFromFile));
    const missingInlineLinks: string[] = [];
    const brokenLinks: string[] = [];

    for (const file of files) {
      const content = await readPage(file);
      const links = [...content.matchAll(internalMarkdownLink)].map(
        (match) => match[1],
      );

      if (links.length === 0) {
        missingInlineLinks.push(file);
      }

      const minimum = [
        "apps/",
        "plugins/",
        "ui/components/",
        "extend/develop/api-reference/",
      ].some((prefix) => file.startsWith(prefix))
        ? 3
        : 0;
      expect(
        links.length,
        `${file} should expose at least ${minimum} inline documentation links`,
      ).toBeGreaterThanOrEqual(minimum);

      for (const href of links) {
        if (!pagePaths.has(normalizeDocsHref(href ?? ""))) {
          brokenLinks.push(`${file} -> ${href}`);
        }
      }
    }

    expect(missingInlineLinks).toEqual([]);
    expect(brokenLinks).toEqual([]);
  });
});
