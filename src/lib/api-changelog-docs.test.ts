import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const docsRoot = join(import.meta.dir, "../../content/docs");
// The change log is split by service group: the entry page keeps the hosted
// API and prompt registry, and links the Mail/MCP and standalone-service pages.
const CHANGELOG_PAGES: Record<string, readonly string[]> = {
  "reference/api/changelog.mdx": [
    "### Hosted API at api.ryuhq.com",
    "### Prompt registry",
  ],
  "reference/api/changelog-mail.mdx": ["### Hosted Mail", "### Hosted MCP"],
  "reference/api/changelog-services.mdx": [
    "### Managed Agents",
    "### Notify",
    "### Box",
    "### Connect",
    "### Sites",
    "### Gateway",
    "### Passport",
  ],
};

function readDoc(relativePath: string): string {
  return readFileSync(join(docsRoot, relativePath), "utf8");
}

/** The heading slug Fumadocs generates (github-slugger rules for plain headings). */
function headingSlug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replaceAll(/`/g, "")
    .replaceAll(/[^\p{L}\p{N}\s_-]/gu, "")
    .replaceAll(/\s/g, "-");
}

function anchorsOf(content: string): Set<string> {
  const anchors = new Set<string>();
  let inFence = false;
  for (const line of content.split("\n")) {
    if (line.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      continue;
    }
    const heading = /^#{1,6}\s+(.+)$/.exec(line);
    if (heading?.[1]) {
      anchors.add(headingSlug(heading[1]));
    }
    for (const match of line.matchAll(/<span id="([^"]+)"/g)) {
      if (match[1]) {
        anchors.add(match[1]);
      }
    }
  }
  return anchors;
}

function pageFileFor(docsPath: string): string | undefined {
  const relative = docsPath.replace(/^\/docs\//, "");
  for (const candidate of [`${relative}.mdx`, `${relative}/index.mdx`]) {
    if (existsSync(join(docsRoot, candidate))) {
      return candidate;
    }
  }
  return;
}

function unreleasedSection(content: string): string {
  const start = content.indexOf("\n## Unreleased\n");
  expect(start).toBeGreaterThan(-1);
  const end = content.indexOf("\n## ", start + 1);
  return content.slice(start, end === -1 ? undefined : end);
}

describe("hosted API change log", () => {
  const changelogs = Object.keys(CHANGELOG_PAGES).map((file) => ({
    content: readDoc(file),
    file,
  }));
  /** Every page's Unreleased section, joined: the log as one reader sees it. */
  const allUnreleased = () =>
    changelogs.map(({ content }) => unreleasedSection(content)).join("\n");

  test("has an undated Unreleased section with no invented versions", () => {
    for (const { content } of changelogs) {
      const unreleased = unreleasedSection(content);
      // No calendar dates or release numbers: those are assigned at release time.
      expect(unreleased).not.toMatch(/\b20\d\d-\d\d-\d\d\b/);
      expect(unreleased).not.toMatch(
        /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\b/,
      );
      expect(unreleased).not.toMatch(/\bv?\d+\.\d+\.\d+\b/);
    }
  });

  test("covers each service whose server behavior changed", () => {
    for (const { content, file } of changelogs) {
      const unreleased = unreleasedSection(content);
      for (const heading of CHANGELOG_PAGES[file] ?? []) {
        expect({
          file,
          heading,
          ok: unreleased.includes(`\n${heading}\n`),
        }).toEqual({ file, heading, ok: true });
      }
    }
    const unreleased = allUnreleased();
    for (const fragment of [
      "X-Request-ID",
      "scopes_supported",
      "/api/mail/realtime/tickets",
      "?token=",
      "prompts:manage",
      "Structured Field",
      "Standard Webhooks",
      "RFC 2047",
      "Idempotent-Replayed",
      "upstream_status",
      "405 method_not_allowed",
      "idempotency_key_invalid",
    ]) {
      expect(unreleased).toContain(fragment);
    }
  });

  test("gives every entry what changed, who is affected, and what to do", () => {
    const entries = changelogs.flatMap(({ content }) =>
      unreleasedSection(content).split("\n#### ").slice(1),
    );
    expect(entries.length).toBeGreaterThan(20);
    for (const entry of entries) {
      const title = entry.split("\n")[0];
      expect({ title, ok: entry.includes("**What changed.**") }).toEqual({
        title,
        ok: true,
      });
      expect({ title, ok: entry.includes("**Who is affected.**") }).toEqual({
        title,
        ok: true,
      });
      expect({ title, ok: entry.includes("**What to do.**") }).toEqual({
        title,
        ok: true,
      });
      expect({ title, ok: /\]\(\/docs\//.test(entry) }).toEqual({
        title,
        ok: true,
      });
    }
  });

  test("every docs link resolves to a page and heading", () => {
    const links = changelogs.flatMap(({ content }) => {
      const ownAnchors = anchorsOf(content);
      return [...content.matchAll(/\]\((\/docs\/[^)\s]+|#[^)\s]+)\)/g)]
        .map((match) => match[1] ?? "")
        .filter((link) => link !== "")
        .map((link) => ({ link, ownAnchors }));
    });
    expect(links.length).toBeGreaterThan(20);
    for (const { link, ownAnchors } of links) {
      const [path = "", fragment] = link.split("#");
      if (path === "") {
        expect({ link, ok: ownAnchors.has(fragment ?? "") }).toEqual({
          link,
          ok: true,
        });
        continue;
      }
      const file = pageFileFor(path);
      expect({ link, file: file !== undefined }).toEqual({ link, file: true });
      if (file && fragment) {
        expect({ link, ok: anchorsOf(readDoc(file)).has(fragment) }).toEqual({
          link,
          ok: true,
        });
      }
    }
  });

  test("states the breaking cases and exceptions callers will hit", () => {
    const unreleased = allUnreleased();
    for (const fragment of [
      // Passport: existing senders of Idempotency-Key must change.
      "If you already send `Idempotency-Key` on connection creates",
      "Before, Passport ignored the header.",
      // Notify: literal encoded-word publishers must wrap.
      "If you publish literal encoded-word text, you must wrap",
      // Box: a bad cwd completes with 126.
      "`126` when `cwd` is missing",
      // Hosted Mail realtime limits, allowlist, slow consumer, retryable 503.
      "`1013`",
      "16 open sockets",
      "IP allowlist",
      "503 realtime_store_unavailable",
      // Managed Agents never echo a caller's request id.
      "except on Managed\nAgents routes",
      // The self-hosted socket refuses a query-string token.
      "only in `?token=<token>`\nanswers `401`",
    ]) {
      expect({ fragment, ok: unreleased.includes(fragment) }).toEqual({
        fragment,
        ok: true,
      });
    }
    // OAuth: scopes were added, nothing callers relied on was removed.
    expect(unreleased).not.toContain("may request only the hosted Mail scopes");
    expect(unreleased).not.toContain("can still carry");
    // The query-token fallback was removed before release.
    expect(unreleased).not.toContain("deprecated from the start");
  });

  test("the errors page documents the request id echo rule", () => {
    const errors = readDoc("reference/api/errors.mdx");
    expect(errors).toContain("## Request IDs");
    expect(errors).toContain("starts with `req_` in any letter case");
    expect(errors).toContain("up to 128 characters");
  });
});
