import { describe, expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import * as path from "node:path";

import { buildPage, readCoreCatalogState } from "./generate-catalog";

const REPO_ROOT = path.resolve(import.meta.dir, "../../..");
const DOCS_ROOT = path.join(REPO_ROOT, "apps/fumadocs/content/docs");
const APP_STORE = path.join(REPO_ROOT, "apps-store");
const PLUGIN_STORES = [
  path.join(REPO_ROOT, "plugins-store", "plugins"),
  path.join(REPO_ROOT, "plugins-store", "lsp"),
  path.join(REPO_ROOT, "plugins-store", "external_plugins"),
];

type Manifest = {
  id?: string;
  category?: string;
  version?: string;
  stability?: string;
  system?: boolean;
  hidden?: boolean;
  surfaces?: Record<string, { support?: string }>;
  targets?: string[];
};

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
      const manifest = JSON.parse(
        await readFile(manifestPath, "utf8"),
      ) as Manifest;
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
  return (await readdir(path.join(DOCS_ROOT, realm)))
    .filter((entry) => entry.endsWith(".mdx") && entry !== "index.mdx")
    .map((entry) => entry.replace(/\.mdx$/, ""))
    .sort();
}

describe("Apps and Plugins catalog documentation", () => {
  test("every detail page mirrors manifest and Core status attributes", async () => {
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
      expect(pages).toEqual([...manifests.keys()].sort());
      for (const slug of pages) {
        const manifest = manifests.get(slug);
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

    expect(page).toContain("## Gateway budget snapshot");
    expect(page).toContain("## Production readiness");
  });
});
