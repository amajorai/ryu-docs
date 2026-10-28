import { afterEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import {
  catalogManifestSchema,
  type CatalogManifest as Manifest,
} from "./catalog-manifest";
import {
  applyRealmPlan,
  buildPage,
  type CatalogEntry,
  catalogRealms,
  GENERATED_MARKER,
  isGeneratedCatalogFile,
  mergeRealmMetaPages,
  parseCatalogGuide,
  planRealm,
  type RealmOptions,
  readCoreCatalogState,
  realmDrift,
} from "./generate-catalog";

const REPO_ROOT = path.resolve(import.meta.dir, "../../..");
const DOCS_ROOT = path.join(REPO_ROOT, "apps/fumadocs/content/docs");
const APP_STORE = path.join(REPO_ROOT, "apps-store");
const PLUGIN_STORES = [
  path.join(REPO_ROOT, "plugins-store", "plugins"),
  path.join(REPO_ROOT, "plugins-store", "lsp"),
  path.join(REPO_ROOT, "plugins-store", "external_plugins"),
];
const APP_PAGE_ALIASES = new Map([["studio", "reelfarm"]]);

async function readStoreManifests(
  storeRoot: string,
  external = false,
): Promise<Map<string, Manifest & { external?: boolean }>> {
  const entries = await readdir(storeRoot, { withFileTypes: true });
  const manifests = new Map<string, Manifest & { external?: boolean }>();
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const manifestPath = path.join(storeRoot, entry.name, "manifest.json");
    try {
      const manifest = catalogManifestSchema.parse(
        JSON.parse(await readFile(manifestPath, "utf8")),
      );
      manifests.set(
        entry.name,
        external ? { ...manifest, external: true } : manifest,
      );
    } catch {
      // The catalog generator intentionally skips directories without a manifest.
    }
  }
  return manifests;
}

async function pageSlugs(realm: "apps" | "plugins"): Promise<string[]> {
  const entries = (await readdir(path.join(DOCS_ROOT, realm))).filter(
    (entry) => entry.endsWith(".mdx") && entry !== "index.mdx",
  );
  const pages = await Promise.all(
    entries.map(async (entry) => {
      const source = await readFile(path.join(DOCS_ROOT, realm, entry), "utf8");
      const frontmatter =
        /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(source)?.[1] ?? "";
      return /^catalog:\s/mu.test(frontmatter)
        ? entry.replace(/\.mdx$/, "")
        : null;
    }),
  );
  return pages.filter((slug): slug is string => slug !== null).sort();
}

describe("Apps and Plugins catalog documentation", () => {
  test("related catalog links use public slugs for package directory paths", () => {
    const state = {
      builtInIds: new Set<string>(),
      preinstalledIds: new Set<string>(),
    };
    const page = buildPage(
      { id: "@ryu/headroom", name: "Headroom" },
      "plugins",
      [
        { dir: "plugins-store/plugins/expect", manifest: { name: "Expect" } },
        {
          dir: "C:\\ryu\\plugins-store\\plugins\\side-chats",
          manifest: { name: "Side Chats" },
        },
      ],
      state,
    );
    expect(page).toContain("[Expect](/docs/plugins/expect)");
    expect(page).toContain("[Side Chats](/docs/plugins/side-chats)");
    expect(page).not.toContain("/docs/plugins/plugins-store/");
    const app = buildPage(
      { id: "@ryu/video-studio", name: "Video Studio" },
      "apps",
      [{ dir: "apps-store/reelfarm", manifest: { name: "Studio" } }],
      state,
    );
    expect(app).toContain("[Studio](/docs/apps/studio)");
  });

  test("Switchboard catalog output keeps JSON braces literal in inline code", async () => {
    const manifest = JSON.parse(
      await readFile(
        path.join(PLUGIN_STORES[0], "agent-comms", "manifest.json"),
        "utf8",
      ),
    );
    const page = buildPage(
      manifest,
      "plugins",
      [],
      readCoreCatalogState(REPO_ROOT),
    );

    expect(page).toContain(
      "Returns `{ok, agents:[{id, name, description, model, engine}], count}`",
    );
    expect(page).not.toContain("`&#123;");
    expect(page).not.toContain("&#125;`");
  });

  test("preserves authored decision-provider guides with generated catalog metadata", async () => {
    const catalogState = readCoreCatalogState(REPO_ROOT);
    for (const name of ["kev", "cloudflare-clef"]) {
      const manifest = JSON.parse(
        await readFile(
          path.join(PLUGIN_STORES[0], name, "manifest.json"),
          "utf8",
        ),
      );
      const guide = (
        await readFile(
          path.join(
            REPO_ROOT,
            "apps/fumadocs/content-guides/plugins",
            `${name}.mdx`,
          ),
          "utf8",
        )
      ).trim();
      const page = buildPage(manifest, "plugins", [], catalogState);
      expect(page).toContain(`"id":"${manifest.id}"`);
      expect(page).toContain(guide);
      expect(page).toContain("/docs/core/decision-models");
    }
  });

  test("every catalog detail page mirrors manifest and Core status attributes", async () => {
    const [apps, plugins, lsp, externalPlugins, appPages, pluginPages] =
      await Promise.all([
        readStoreManifests(APP_STORE),
        readStoreManifests(PLUGIN_STORES[0]),
        readStoreManifests(PLUGIN_STORES[1]),
        readStoreManifests(PLUGIN_STORES[2], true),
        pageSlugs("apps"),
        pageSlugs("plugins"),
      ]);
    const pluginManifests = new Map([...plugins, ...lsp, ...externalPlugins]);
    const catalogState = readCoreCatalogState(REPO_ROOT);

    expect(appPages).toHaveLength(apps.size);
    expect(pluginPages).toHaveLength(pluginManifests.size);

    for (const [realm, manifests, pages] of [
      ["apps", apps, appPages],
      ["plugins", pluginManifests, pluginPages],
    ] as const) {
      const expectedPageSlugs = [...manifests.keys()]
        .map((slug) =>
          realm === "apps"
            ? ([...APP_PAGE_ALIASES.entries()].find(
                ([, source]) => source === slug,
              )?.[0] ?? slug)
            : slug,
        )
        .sort();
      expect(pages).toEqual(expectedPageSlugs);
      for (const slug of pages) {
        const manifest = manifests.get(
          realm === "apps" ? (APP_PAGE_ALIASES.get(slug) ?? slug) : slug,
        );
        expect(manifest).toBeDefined();
        const page = await readFile(
          path.join(DOCS_ROOT, realm, `${slug}.mdx`),
          "utf8",
        );
        const id = manifest?.id ?? "not declared";
        const idKey = manifest?.id ?? "";
        const catalogLine = page
          .split("\n")
          .find((line) => line.startsWith("catalog: "));
        expect(catalogLine).toBeDefined();
        const catalog = JSON.parse(
          catalogLine?.slice("catalog: ".length) ?? "{}",
        );

        expect(catalog).toMatchObject({
          kind: realm === "apps" ? "app" : "plugin",
          id,
          category: manifest?.category ?? "Uncategorized",
          version: manifest?.version ?? "0.0.0",
          official: true,
          builtIn: catalogState.builtInIds.has(idKey),
          system: manifest?.system === true,
          preInstalled: catalogState.preinstalledIds.has(idKey),
          stability: manifest?.stability?.trim().toLowerCase() || "stable",
          hidden: manifest?.hidden === true,
        });
        const expectedSurfaces =
          manifest?.surfaces !== undefined
            ? Object.fromEntries(
                Object.entries(manifest.surfaces).map(([surface, entry]) => [
                  surface,
                  entry.support?.trim() || "none",
                ]),
              )
            : manifest?.targets && manifest.targets.length > 0
              ? Object.fromEntries(
                  manifest.targets.map((surface) => [surface, "supported"]),
                )
              : undefined;
        if (expectedSurfaces === undefined) {
          expect(catalog).not.toHaveProperty("surfaces");
        } else {
          expect(catalog.surfaces).toEqual(expectedSurfaces);
        }
        expect(page).not.toContain("\n## Surfaces\n");
        expect(page).not.toContain("## Attributes");
        if (manifest?.external === true) {
          expect(catalog.external).toBe(true);
        }
      }
    }
  });

  test("catalog landing pages explain the shared status vocabulary", async () => {
    for (const realm of ["apps", "plugins"] as const) {
      const page = await readFile(
        path.join(DOCS_ROOT, realm, "index.mdx"),
        "utf8",
      );
      expect(page).toContain("## Attribute legend");
      for (const label of [
        "Official",
        "Built-in",
        "System",
        "Pre-installed",
        "Stability",
        "Hidden",
        "Surfaces",
      ]) {
        expect(page).toContain(`**${label}**`);
      }
    }
  });

  test("breaks long detail descriptions into readable paragraphs", () => {
    const description = Array.from(
      { length: 8 },
      (_, index) =>
        `Sentence ${index + 1} describes a documented catalog behavior with enough detail to keep the example representative and useful for readers.`,
    ).join(" ");
    const page = buildPage(
      {
        id: "com.example.catalog-density",
        name: "Catalog density fixture",
        description,
      },
      "apps",
      [],
      { builtInIds: new Set(), preinstalledIds: new Set() },
    );
    const whatItDoes = page
      .split("## What it does\n\n")[1]
      ?.split("\n\nThis page is part", 1)[0];

    expect(whatItDoes).toBeString();
    const paragraphs = whatItDoes?.split("\n\n") ?? [];
    expect(paragraphs.length).toBeGreaterThan(1);
    expect(
      Math.max(...paragraphs.map((paragraph) => paragraph.length)),
    ).toBeLessThanOrEqual(900);
  });

  test("breaks long tool descriptions into readable paragraphs", () => {
    const description = Array.from(
      { length: 8 },
      (_, index) =>
        `Sentence ${index + 1} explains how the tool takes {options} | flags with enough detail to keep the example representative.`,
    ).join(" ");
    const page = buildPage(
      {
        id: "com.example.tool-density",
        name: "Tool density fixture",
        description: "A plugin with one long tool description.",
        runnables: [
          {
            id: "tool-density.run",
            kind: "tool",
            config: { slug: "tool-density.run", description },
          },
        ],
      },
      "plugins",
      [],
      { builtInIds: new Set(), preinstalledIds: new Set() },
    );
    const toolProse = page
      .split("### `tool-density.run`")[1]
      ?.split("\n\n")
      .slice(1)
      .filter((block) => block.startsWith("Sentence"));

    expect(toolProse?.length).toBeGreaterThan(1);
    for (const paragraph of toolProse ?? []) {
      expect(paragraph.length).toBeLessThanOrEqual(900);
      expect(paragraph).not.toContain("{");
      expect(paragraph).not.toContain("|");
    }
    expect(toolProse?.join(" ")).toContain("Sentence 8");
  });

  test("renders the authored Video Studio guide in the app catalog page", () => {
    const page = buildPage(
      {
        id: "@ryu/video-studio",
        name: "Video Studio",
        description: "Edit layered video timelines.",
      },
      "apps",
      [],
      { builtInIds: new Set(), preinstalledIds: new Set() },
    );

    expect(page).toContain("## Video Studio guides");
    expect(page).toContain("(/docs/apps/video-studio-finishing)");
    expect(page).toContain("(/docs/apps/video-studio-agents)");
  });

  test("renders the authored Writing Style guide in the plugin catalog page", () => {
    const page = buildPage(
      {
        id: "@ryu/writing-style",
        name: "Writing Style",
        description: "Extract a personal writing guide.",
      },
      "plugins",
      [],
      { builtInIds: new Set(), preinstalledIds: new Set() },
    );

    expect(page).toContain("## How it works");
    expect(page).toContain("personal-writing-style.md");
    expect(page).toContain("can compose with a selected profile");
  });

  test("does not claim an Apps shelf or Companion for provider-only apps", () => {
    const page = buildPage(
      {
        id: "@ryu/content",
        name: "Content",
        description: "A list-only catalog preview.",
        contributes: {
          chat_widget_templates: [
            {
              id: "content.chat",
              title: "Content widget",
              description: "Coming soon; no render tool is available yet.",
            },
          ],
        },
        runnables: [],
      },
      "apps",
      [],
      { builtInIds: new Set(), preinstalledIds: new Set() },
    );

    expect(page).not.toContain("### Apps shelf");
    expect(page).not.toContain("feature navigation stays inside the Companion");
    expect(page).toContain("### chat widget templates");
  });

  test("describes a real non-Companion shell contribution without inventing a Companion", () => {
    const page = buildPage(
      {
        id: "@ryu/agent-status",
        name: "Agent Status",
        description: "Live run status.",
        contributes: {
          backgrounds: [
            {
              attribution: "PatternCraft",
              attributionUrl: "https://example.com/patterncraft/aurora",
              backdropId: "aurora-flow",
              id: "@ryu/agent-status:aurora",
              label: "Aurora",
            },
          ],
          sidebar_buttons: [
            {
              id: "home",
              title: "Agent Status",
            },
          ],
          sidebar_sections: [
            {
              id: "working",
              title: "Working",
            },
          ],
        },
        runnables: [],
      },
      "apps",
      [],
      { builtInIds: new Set(), preinstalledIds: new Set() },
    );

    expect(page).toContain("### Desktop shell");
    expect(page).toContain("declared desktop shell surfaces below");
    expect(page).toContain("### Sidebar buttons");
    expect(page).toContain("### Wallpaper backgrounds");
    expect(page).not.toContain("feature navigation stays inside the Companion");
  });
});

test("catalog projection preserves legacy omissions and ignores non-list contribution groups", () => {
  const parsed = catalogManifestSchema.parse({
    name: "Future provider",
    future_manifest_field: { version: 2 },
    contributes: {
      lsp_servers: { language: "rust" },
      views: [{ id: "future-view", title: "Future view", future_field: true }],
    },
  });
  expect(parsed.id).toBeUndefined();
  expect(parsed.version).toBeUndefined();
  expect(parsed.system).toBeUndefined();
  const page = buildPage(parsed, "plugins", [], {
    builtInIds: new Set<string>(),
    preinstalledIds: new Set<string>(),
  });
  expect(page).toContain("Future view");
  expect(page).not.toContain("### lsp servers");
});

test("catalog projection rejects malformed nested rendering fields", () => {
  expect(
    catalogManifestSchema.safeParse({ runnables: [{ config: { name: 42 } }] })
      .success,
  ).toBe(false);
  expect(
    catalogManifestSchema.safeParse({
      contributes: { views: [{ title: null }] },
    }).success,
  ).toBe(false);
  expect(catalogManifestSchema.safeParse({ id: 42 }).success).toBe(false);
});

describe("catalog regeneration safety", () => {
  const emptyState = {
    builtInIds: new Set<string>(),
    preinstalledIds: new Set<string>(),
  };
  const tempRoots: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempRoots.splice(0).map((root) => rm(root, { recursive: true })),
    );
  });

  async function fixtureRealm(
    manifests: CatalogEntry[],
  ): Promise<RealmOptions & { guidesRoot: string }> {
    const root = await mkdtemp(path.join(tmpdir(), "ryu-catalog-"));
    tempRoots.push(root);
    const outDir = path.join(root, "content", "apps");
    const guidesRoot = path.join(root, "guides");
    await mkdir(outDir, { recursive: true });
    await mkdir(path.join(guidesRoot, "apps"), { recursive: true });
    return {
      outDir,
      guidesRoot,
      title: "Apps",
      description: "Fixture apps.",
      icon: "AppWindow",
      base: "apps",
      manifests,
      catalogState: emptyState,
    };
  }

  const alpha: CatalogEntry = {
    dir: "alpha",
    manifest: {
      id: "@ryu/alpha",
      name: "Alpha",
      category: "Productivity",
      description: "Alpha keeps a fixture ledger.",
      permission_grants: ["app:http"],
    },
  };
  const beta: CatalogEntry = {
    dir: "beta",
    manifest: {
      id: "@ryu/beta",
      name: "Beta",
      category: "Productivity",
      description: "Beta answers fixture questions.",
    },
  };

  async function regenerate(realm: RealmOptions): Promise<string[]> {
    return await applyRealmPlan(planRealm(realm), realm.outDir);
  }

  test("hand-written pages without the marker survive and keep their meta.json slot", async () => {
    const realm = await fixtureRealm([alpha]);
    await regenerate(realm);
    const handPage = "---\ntitle: Showcase\n---\n\nHand-written.\n";
    await writeFile(path.join(realm.outDir, "showcase.mdx"), handPage);
    const metaPath = path.join(realm.outDir, "meta.json");
    const meta = JSON.parse(await readFile(metaPath, "utf8"));
    meta.pages.splice(1, 0, "showcase");
    await writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`);

    await regenerate(realm);

    expect(
      await readFile(path.join(realm.outDir, "showcase.mdx"), "utf8"),
    ).toBe(handPage);
    const merged = JSON.parse(await readFile(metaPath, "utf8"));
    expect(merged.pages).toEqual([
      "index",
      "showcase",
      "---Productivity---",
      "alpha",
    ]);
  });

  test("an unmarked page in a catalog slot is never overwritten", async () => {
    const realm = await fixtureRealm([alpha]);
    const handPage = "---\ntitle: Alpha\n---\n\nHand-owned alpha page.\n";
    await writeFile(path.join(realm.outDir, "alpha.mdx"), handPage);

    const plan = planRealm(realm);
    await applyRealmPlan(plan, realm.outDir);

    expect(plan.handOwned).toEqual([path.join(realm.outDir, "alpha.mdx")]);
    expect(await readFile(path.join(realm.outDir, "alpha.mdx"), "utf8")).toBe(
      handPage,
    );
    const index = await readFile(path.join(realm.outDir, "index.mdx"), "utf8");
    expect(index).toContain('<DocCard href="/docs/apps/alpha" />');
  });

  test("a generated page whose manifest left the catalog is deleted", async () => {
    const realm = await fixtureRealm([alpha, beta]);
    await regenerate(realm);
    const betaPath = path.join(realm.outDir, "beta.mdx");
    expect(isGeneratedCatalogFile(await readFile(betaPath, "utf8"))).toBe(true);

    const plan = planRealm({ ...realm, manifests: [alpha] });
    expect(plan.deletes).toEqual([betaPath]);
    await applyRealmPlan(plan, realm.outDir);

    expect(existsSync(betaPath)).toBe(false);
    const meta = JSON.parse(
      await readFile(path.join(realm.outDir, "meta.json"), "utf8"),
    );
    expect(meta.pages).not.toContain("beta");
  });

  test("guide lead, description, and anchored inserts render into the page", async () => {
    const realm = await fixtureRealm([alpha, beta]);
    await writeFile(
      path.join(realm.guidesRoot, "apps", "alpha.mdx"),
      [
        "{/* catalog:description */}",
        "",
        "Alpha, described by hand.",
        "",
        '{/* catalog:insert {"after":["## Permissions"]} */}',
        "",
        "Why Alpha asks for HTTP.",
        "",
        '{/* catalog:insert {"after":["## Permissions","**Grants:**"],"tight":true} */}',
        "",
        "Granted on install.",
        "",
        '{/* catalog:insert {"before":["This page is part of the "]} */}',
        "",
        "Before the navigation.",
        "",
        '{/* catalog:insert {"at":"end"} */}',
        "",
        "## Notes",
        "",
        "Closing note.",
        "",
      ].join("\n"),
    );
    await writeFile(
      path.join(realm.guidesRoot, "apps", "beta.mdx"),
      "## How Beta works\n\nAuthored lead.\n",
    );
    await regenerate(realm);

    const alphaPage = await readFile(
      path.join(realm.outDir, "alpha.mdx"),
      "utf8",
    );
    expect(alphaPage).toContain(
      "## What it does\n\nAlpha, described by hand.\n\nBefore the navigation.\n\nThis page is part of the",
    );
    // The frontmatter description still projects the manifest; the body does not.
    expect(alphaPage).not.toContain("\nAlpha keeps a fixture ledger.\n");
    expect(alphaPage).toContain(
      "## Permissions\n\nWhy Alpha asks for HTTP.\n\n**Grants:** `app:http`\nGranted on install.\n",
    );
    expect(alphaPage.endsWith("## Notes\n\nClosing note.\n")).toBe(true);

    const betaPage = await readFile(
      path.join(realm.outDir, "beta.mdx"),
      "utf8",
    );
    expect(betaPage).toContain(
      "compare [Alpha](/docs/apps/alpha).\n\n## How Beta works\n\nAuthored lead.\n",
    );
    expect(betaPage).not.toContain("## What it does");
  });

  test("regeneration is idempotent and drift is detected", async () => {
    const realm = await fixtureRealm([alpha, beta]);
    await writeFile(
      path.join(realm.guidesRoot, "apps", "index.mdx"),
      '{/* catalog:insert {"before":["## Attribute legend"]} */}\n\nHand intro.\n',
    );
    expect((await regenerate(realm)).length).toBeGreaterThan(0);
    expect(
      await readFile(path.join(realm.outDir, "index.mdx"), "utf8"),
    ).toContain("Hand intro.\n\n## Attribute legend");
    expect(realmDrift(planRealm(realm))).toEqual([]);
    expect(await regenerate(realm)).toEqual([]);

    const alphaPath = path.join(realm.outDir, "alpha.mdx");
    const edited = (await readFile(alphaPath, "utf8")).replace(
      "Alpha keeps",
      "Alpha once kept",
    );
    await writeFile(alphaPath, edited);
    expect(realmDrift(planRealm(realm))).toEqual([alphaPath]);
  });

  test("guides fail loudly instead of silently dropping prose", async () => {
    expect(() =>
      parseCatalogGuide(
        '{/* catalog:insert {"after":["x"],"at":"end"} */}\n\nx',
      ),
    ).toThrow("exactly one of after, before, or at");
    expect(() =>
      buildPage(alpha.manifest, "apps", [], emptyState, {
        guide: parseCatalogGuide(
          '{/* catalog:insert {"after":["## Missing heading"]} */}\n\nOrphan.',
        ),
      }),
    ).toThrow("matched 0 generated lines");

    const realm = await fixtureRealm([alpha]);
    await writeFile(
      path.join(realm.guidesRoot, "apps", "gamma.mdx"),
      "Prose for a page that does not exist.\n",
    );
    expect(() => planRealm(realm)).toThrow("does not match a catalog page");
  });

  test("capability verbs name the extra tools their adapter calls", () => {
    const page = buildPage(
      catalogManifestSchema.parse({
        id: "@ryu/fixture-search",
        name: "Fixture Search",
        provides: [
          {
            capability: "web.search",
            title: "Search",
            tools: {
              "web.search": {
                tool: "fixture.search",
                adapter: { tools: ["fixture.free_search"] },
              },
            },
          },
        ],
      }),
      "plugins",
      [],
      emptyState,
      { guide: null },
    );
    expect(page).toContain(
      "- `web.search` -> `fixture.search` (adapter also calls `fixture.free_search`)",
    );
  });

  test("meta.json merge drops stale separators but keeps hand groups", () => {
    expect(
      mergeRealmMetaPages(
        ["index", "---A---", "a1", "---B---", "b1"],
        [
          "index",
          "---A---",
          "a1",
          "---Guides---",
          "a1-guide",
          "---Gone---",
          "retired",
          "---B---",
          "b1",
        ],
        new Set(["retired"]),
      ),
    ).toEqual([
      "index",
      "---A---",
      "a1",
      "---Guides---",
      "a1-guide",
      "---B---",
      "b1",
    ]);
  });

  test("committed Apps and Plugins catalog output matches its sources", () => {
    for (const realm of catalogRealms()) {
      expect(realmDrift(planRealm(realm))).toEqual([]);
    }
    expect(GENERATED_MARKER).toBe('generated: "generate:catalog"');
  });
});
