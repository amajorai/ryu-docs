import { expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const docsRoot = fileURLToPath(new URL("../../content/docs/", import.meta.url));

const forbiddenReferencePatterns = [
  { label: "ASCII provider hostname", pattern: /\bascii\.dev\b/i },
  { label: "Box Public API attribution", pattern: /\bBox Public API\b/i },
  { label: "upstream Box attribution", pattern: /\bupstream Box\b/i },
  { label: "Box-compatible attribution", pattern: /\bBox-compatible\b/i },
];

async function listMdxFiles(directory: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const filePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listMdxFiles(filePath)));
    } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
      files.push(filePath);
    }
  }

  return files;
}

test("public docs do not expose Box reference-product attribution", async () => {
  const files = await listMdxFiles(docsRoot);
  const findings: string[] = [];

  for (const filePath of files) {
    const content = await readFile(filePath, "utf8");
    for (const { label, pattern } of forbiddenReferencePatterns) {
      if (pattern.test(content)) {
        findings.push(`${filePath}: ${label}`);
      }
    }
  }

  expect(findings).toEqual([]);
});
