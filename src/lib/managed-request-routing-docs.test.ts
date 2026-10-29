import { expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const docsRoot = fileURLToPath(new URL("../../content/docs/", import.meta.url));
const gatewayDialogPath = fileURLToPath(
  new URL(
    "../../../desktop/src/components/gateway/GatewayDialog.tsx",
    import.meta.url,
  ),
);
const nodeRoutingSettingsPath = fileURLToPath(
  new URL(
    "../../../desktop/src/components/settings/NodeRoutingSettings.tsx",
    import.meta.url,
  ),
);

const CARD_TITLE = "Managed request routing";
const DESKTOP_PATHS = new Set([
  `Gateway → Network → ${CARD_TITLE}`,
  `Gateway settings → Network → ${CARD_TITLE}`,
]);

async function mdxFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        return mdxFiles(path);
      }
      return Promise.resolve(entry.name.endsWith(".mdx") ? [path] : []);
    }),
  );
  return nested.flat();
}

/** The JSX rendered for one Gateway section: `{section === "<id>" ? ( … ) : null}`. */
function sectionBody(source: string, sectionId: string): string {
  const opener = `{section === "${sectionId}" ? (`;
  const start = source.indexOf(opener);
  if (start === -1) {
    return "";
  }
  const end = source.indexOf(") : null}", start);
  return end === -1 ? "" : source.slice(start, end);
}

test("Desktop renders the Managed request routing card only in Gateway → Network", async () => {
  const dialog = await Bun.file(gatewayDialogPath).text();
  const card = await Bun.file(nodeRoutingSettingsPath).text();

  expect(card).toContain(`title="${CARD_TITLE}"`);
  expect(dialog).toMatch(/value: "network",\s*label: "Network",/);
  expect(sectionBody(dialog, "network")).toContain("<NodeRoutingSettings />");
  // The card is mounted once, so the Network section is its only location.
  expect(dialog.match(/<NodeRoutingSettings\b/g)).toHaveLength(1);
});

test("every public page that names the Managed request routing card gives its Gateway → Network path", async () => {
  const locations: { file: string; path: string }[] = [];
  for (const file of await mdxFiles(docsRoot)) {
    const text = (await Bun.file(file).text()).replace(/\s+/g, " ");
    for (const match of text.matchAll(/\*\*([^*]*→[^*]*)\*\*/g)) {
      const path = match[1]?.trim() ?? "";
      if (path.endsWith(CARD_TITLE)) {
        // POSIX separators, so the expectations read the same on Windows.
        locations.push({
          file: file.slice(docsRoot.length).replaceAll("\\", "/"),
          path,
        });
      }
    }
  }

  expect(locations.map(({ file }) => file)).toContain(
    "providers/openrouter.mdx",
  );
  for (const location of locations) {
    expect({ ...location, valid: DESKTOP_PATHS.has(location.path) }).toEqual({
      ...location,
      valid: true,
    });
  }
});
