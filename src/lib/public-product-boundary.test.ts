import { expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { publicBoundaryViolations } from "../../../../tools/release-notes-public-safe.mjs";

const docsRoot = fileURLToPath(new URL("../../content/docs/", import.meta.url));

const forbiddenPublicPatterns = [
  { label: "internal grant test switch", pattern: /\bRYU_STUB_[A-Z_]+\b/ },
  { label: "ASCII provider hostname", pattern: /\bascii\.dev\b/i },
  { label: "Box Public API attribution", pattern: /\bBox Public API\b/i },
  { label: "upstream Box attribution", pattern: /\bupstream Box\b/i },
  { label: "Box-compatible attribution", pattern: /\bBox-compatible\b/i },
  {
    label: "literal prompt body",
    pattern: /^\s*(?:system|developer|reviewer) prompt\s*:/im,
  },
  {
    label: "summarizer prompt disclosure",
    pattern: /\bthe summarizer uses this system prompt\b/i,
  },
  {
    label: "internal product strategy wording",
    pattern:
      /\b(?:dogfood|what we borrow|what we do not copy|what to borrow|what to learn from the agent products|inspired by the best parts|product direction)\b/i,
  },
  {
    label: "internal benchmark commentary",
    pattern: /\b(?:benchmark pushback|benchmarks are fake|the .*crowd)\b/i,
  },
  {
    label: "internal roadmap milestone",
    pattern: /\broadmap milestone\s+[A-Z]\d+\b/i,
  },
  {
    label: "managed agents private env",
    pattern: /\bRYU_MANAGED_AGENTS_[A-Z_]+\b/,
  },
  {
    label: "messaging private env",
    pattern: /\bRYU_MESSAGING_[A-Z_]+\b/,
  },
  {
    label: "managed agents internal names",
    pattern: /ProviderKeyVault|docs\/managed-agents-spec/,
  },
];

// Public pages are `.mdx`, plus the generated release notes, which are plain
// `.md` because their prose can contain braces MDX would parse as JSX. Scanning
// only `.mdx` once let every release notes page bypass these guards.
async function listMdxFiles(directory: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const filePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listMdxFiles(filePath)));
    } else if (
      entry.isFile() &&
      (entry.name.endsWith(".mdx") || entry.name.endsWith(".md"))
    ) {
      files.push(filePath);
    }
  }

  return files;
}

// This check reads every public MDX file; allow for cold filesystem reads on
// shared development machines while retaining the complete content scan.
test("public docs do not expose private or internal-only wording", async () => {
  const files = await listMdxFiles(docsRoot);
  const findings: string[] = [];

  for (const filePath of files) {
    const content = await readFile(filePath, "utf8");
    for (const { label, pattern } of forbiddenPublicPatterns) {
      if (pattern.test(content)) {
        findings.push(`${filePath}: ${label}`);
      }
    }
  }

  expect(findings).toEqual([]);
}, 30_000);

// Public pages feed llms.txt and the docs MCP server, so a link into the private
// repository's internal `docs/*.md`, its coverage evidence, or the closed repo
// itself would publish a dead or private destination. Public `/docs/...` routes
// (including their `.md` Markdown projection) and external sites stay allowed.
const internalLinkPatterns = [
  {
    label: "repository-relative internal docs/*.md link",
    pattern:
      /\]\((?!https?:|mailto:|\/|#)[^)\s]*\bdocs\/[^)\s]*\.md(?:#[^)\s]*)?\)/,
  },
  {
    label: "repository-relative internal docs/*.md href",
    pattern: /href=["'](?!https?:|mailto:|\/|#)[^"'\s]*\bdocs\/[^"'\s]*\.md\b/,
  },
  {
    label: "closed repository reference",
    pattern: /\bamajorai\/ryu-private\b/,
  },
  {
    label: "internal coverage evidence path",
    pattern: /\bdocs\/test-coverage-[a-z0-9-]+\//,
  },
];

test("public docs never link into the private repository or its internal docs", async () => {
  // The guard must recognize each internal form while allowing public links.
  const internal = [
    "See [the standard](docs/ryu-platform-consistency-standard.md).",
    "See [releasing](../../../../docs/RELEASING.md#mirrors).",
    '<a href="./docs/internal-plan.md">plan</a>',
    "[source](https://github.com/amajorai/ryu-private/blob/main/README.md)",
    "Evidence: docs/test-coverage-cloud-results/web-docs.md",
  ];
  const publicLinks = [
    "[Quickstart](/docs/extend/mcp/quickstart)",
    "[Markdown projection](/docs/extend/mcp/quickstart.md)",
    "[guide](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/custom-provider.md)",
    "[audio](../gateway/audio-api)",
  ];
  const matches = (text: string) =>
    internalLinkPatterns
      .filter(({ pattern }) => pattern.test(text))
      .map(({ label }) => label);
  for (const text of internal) {
    expect({ text, matched: matches(text).length > 0 }).toEqual({
      text,
      matched: true,
    });
  }
  for (const text of publicLinks) {
    expect({ text, matched: matches(text) }).toEqual({ text, matched: [] });
  }

  const findings: string[] = [];
  for (const filePath of await listMdxFiles(docsRoot)) {
    const content = await readFile(filePath, "utf8");
    for (const label of matches(content)) {
      findings.push(`${filePath}: ${label}`);
    }
  }
  expect(findings).toEqual([]);
}, 30_000);

// Release notes are generated from private commit history, so they get the
// strictest boundary: repository source paths, internal docs, private env vars,
// ports, deploy tooling, handoff wording, internal pull request links, and
// rollout-gated surfaces. The generator (tools/release-notes-docs.mjs) removes
// them; this keeps a hand edit or a future rule gap from publishing them.
test("release notes pages carry no repository paths, env vars, ports, or internal links", async () => {
  // The guard must recognize each internal form while allowing public prose.
  const internal = [
    "- Added apps/core/src/composio_host.rs for the host.",
    "- See docs/polar-products.md.",
    "- Set RYU_STUB_GRANT_VALIDATION=1.",
    "- Serves on port 42617 and localhost:3000.",
    "- Deployed to Dokploy via .github/workflows/deploy.yml.",
    "- Updated AGENTS.md.",
    "- Added a router. ([#468](https://github.com/amajorai/ryu/pull/468))",
    "- Workflows bind to connections owned by Passport.",
  ];
  const publicText = [
    "- Added the channels router in channels.ts.",
    "- The README.md describes agents and SECURITY.md the policy.",
    "- GET /pull/:id returns the item.",
    "Built from commit [`0d31bcd`](https://github.com/amajorai/ryu/commit/0d31bcd1).",
  ];
  for (const text of internal) {
    expect({
      text,
      flagged: publicBoundaryViolations(text).length > 0,
    }).toEqual({
      text,
      flagged: true,
    });
  }
  for (const text of publicText) {
    expect({ text, found: publicBoundaryViolations(text) }).toEqual({
      text,
      found: [],
    });
  }

  const releaseNotesRoot = join(docsRoot, "release-notes");
  const files = await listMdxFiles(releaseNotesRoot);
  expect(files.length).toBeGreaterThan(2);
  const findings: string[] = [];
  for (const filePath of files) {
    if (!filePath.endsWith(".md")) {
      continue;
    }
    const content = await readFile(filePath, "utf8");
    for (const violation of publicBoundaryViolations(content)) {
      findings.push(`${filePath}:${violation.line}: ${violation.label}`);
    }
  }
  expect(findings).toEqual([]);
}, 30_000);
