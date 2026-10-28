import { describe, expect, test } from "bun:test";
import {
  chainMatches,
  chainProblem,
  envTables,
  expectedRows,
  hostProblems,
  pythonChainMatches,
  pythonChainProblem,
} from "./standalone-sdk-docs-checks";
import {
  callouts,
  fences,
  INSTALL_CALLOUT,
  inlineCode,
  page,
  pages,
  services,
} from "./standalone-sdk-docs-fixtures";
import {
  INTERNAL_DOC_LINKS,
  SERVICE_PAGES,
} from "./standalone-sdk-docs-samples";

// Part of the standalone SDK docs guard; shared readers and matchers live in
// standalone-sdk-docs-{fixtures,checks,samples}.ts.

describe("standalone SDK docs guard", () => {
  test("finds the SDK pages", () => {
    expect(pages.length).toBeGreaterThan(10);
  });

  test("names only documented hosts", () => {
    const findings = pages.flatMap((entry) =>
      hostProblems(entry.content).map((problem) => `${entry.file}: ${problem}`),
    );
    expect(findings).toEqual([]);
  });

  test("never links into internal docs/*.md files", () => {
    for (const sample of [
      "[plan](docs/standalone-services-dx.md)",
      "see docs/RELEASING.md",
      '<a href="../docs/x.md">x</a>',
    ]) {
      expect(INTERNAL_DOC_LINKS.some((pattern) => pattern.test(sample))).toBe(
        true,
      );
    }
    expect(
      INTERNAL_DOC_LINKS.some((pattern) =>
        pattern.test("[page](/docs/standalone/sdk.md)"),
      ),
    ).toBe(false);
    const findings = pages
      .filter((entry) =>
        INTERNAL_DOC_LINKS.some((pattern) => pattern.test(entry.content)),
      )
      .map((entry) => entry.file);
    expect(findings).toEqual([]);
  });

  test("never names private or invented env vars", () => {
    const banned = [
      /\bRYU_MANAGED_AGENTS_[A-Z0-9_]*/,
      /\b[A-Z0-9_]*_ORG_TOKENS\b/,
      /\b[A-Z0-9_]*_MARKUP_BPS\b/,
    ];
    const findings = pages.flatMap((entry) =>
      banned
        .filter((pattern) => pattern.test(entry.content))
        .map((pattern) => `${entry.file}: ${pattern.source}`),
    );
    expect(findings).toEqual([]);
  });

  test("carries the unpublished-package callout wherever an install command appears", () => {
    expect(services.NPM_PUBLISHED_VERSION).toBeNull();
    const install =
      /\b(?:npm (?:i|install|add)|bun add|pnpm add|yarn add)\b[^\n]*@ryuhq\/services/;
    const withInstall = pages.filter((entry) => install.test(entry.content));
    expect(withInstall.map((entry) => entry.file)).toContain("index.mdx");
    const missing = withInstall
      .filter((entry) => !callouts(entry.content).includes(INSTALL_CALLOUT))
      .map((entry) => entry.file);
    expect(missing).toEqual([]);
  });

  test("never points readers at a repository they cannot reach", () => {
    const unreachable = [
      /workspace packages? of the Ryu repository/i,
      /\bthe SDK's repository\b/i,
    ];
    const findings = pages.flatMap((entry) =>
      unreachable
        .filter((pattern) => pattern.test(entry.content))
        .map((pattern) => `${entry.file}: ${pattern.source}`),
    );
    expect(findings).toEqual([]);
    expect(page("index.mdx").content).toContain(
      "cannot be installed outside Ryu",
    );
  });

  test("service caveats match the services' real behavior", () => {
    // The Mail errors and retries moved to mail-errors.mdx.
    const mail = page("mail-errors.mdx").content;
    expect(page("mail.mdx").content).not.toMatch(/Quote `error\.requestId`/);
    expect(mail).not.toMatch(/Quote `error\.requestId`/);
    expect(mail).toContain("`error.requestId` is always\n`null`");
    expect(mail).toContain("Hosted Mail sends an `X-Request-ID` header");
    expect(page("messaging-errors.mdx").content).toContain(
      "`X-Request-ID` header that the control plane sends on every response",
    );
    // apps/server/src/request-id.ts: a safe id starts with a letter or digit and
    // never takes the server-reserved `req_` prefix.
    const errorsPage = page("errors.mdx").content;
    expect(errorsPage).toContain("starting with a letter or digit");
    expect(errorsPage).toContain(
      "An id that starts with `req_` is replaced with a new one",
    );
    expect(mail).toContain("email transport is not configured");
    expect(mail).toContain("sendConfigured: false");
    const sites = page("sites-errors.mdx").content;
    expect(sites).toMatch(/security_blocked`?\s+is different/);
    expect(sites).toContain("can never be deployed");
    expect(page("mcp.mdx").content).toContain(
      "`RYU_GATEWAY_URL` or `RYU_GATEWAY_TOKEN` to expose the Gateway tools",
    );
    expect(page("index.mdx").content).not.toContain(
      "the token you configured, if any",
    );
    const passport = page("passport.mdx").content;
    const sent = /connections\.create\(\{[^}]*domain: "([^"]+)"/.exec(passport);
    const shown = /"connection": \{[^}]*"domain": "([^"]+)"/.exec(passport);
    expect(sent?.[1]).toBeDefined();
    expect(shown?.[1]).toBe(sent?.[1]);
    // delta.content is string | parts[], so samples must narrow it first.
    const unnarrowed = pages.flatMap((entry) =>
      fences(entry.content)
        .filter((fence) => /delta\.content\s*\?\?/.test(fence.body))
        .map((fence) => `${entry.file}:${fence.line}`),
    );
    expect(unnarrowed).toEqual([]);
  });

  test("env tables equal ENV_VARS", () => {
    const index = envTables(page("index.mdx").content);
    expect(index).toEqual([expectedRows(services.ENV_VARS)]);
    for (const { service, file } of SERVICE_PAGES) {
      const rows = services.ENV_VARS.filter((row) => row.service === service);
      expect({ file, tables: envTables(page(file).content) }).toEqual({
        file,
        tables: [expectedRows(rows)],
      });
    }
    const otherTables = pages
      .filter(
        (entry) =>
          entry.file !== "index.mdx" &&
          !SERVICE_PAGES.some((service) => service.file === entry.file),
      )
      .filter((entry) => envTables(entry.content).length > 0)
      .map((entry) => entry.file);
    expect(otherTables).toEqual([]);
  });

  test("every quickstart quotes its AVAILABILITY label in a callout", () => {
    for (const { service, file } of SERVICE_PAGES) {
      const label = services.AVAILABILITY[service];
      expect({
        file,
        label: callouts(page(file).content).includes(label ?? ""),
      }).toEqual({ file, label: true });
    }
  });

  test("the overview's availability matrix restates every AVAILABILITY label", () => {
    const index = page("index.mdx").content;
    for (const label of Object.values(services.AVAILABILITY)) {
      expect(index).toContain(label);
    }
  });

  test("every ryu.<ns>.<method> chain resolves on the real SDK", () => {
    const findings: string[] = [];
    let checked = 0;
    for (const entry of pages) {
      const code = [
        ...fences(entry.content)
          .filter((fence) =>
            ["ts", "tsx", "js", "typescript"].includes(fence.lang),
          )
          .map((fence) => fence.body),
        ...inlineCode(entry.content),
      ];
      for (const text of code) {
        for (const match of chainMatches(text)) {
          checked += 1;
          const problem = chainProblem(match);
          if (problem) {
            findings.push(`${entry.file}: ${problem}`);
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(50);
    expect(findings).toEqual([]);
  });

  test("every ryu.<ns>.<method> chain in a Python sample resolves on the Python client", () => {
    const findings: string[] = [];
    let checked = 0;
    for (const entry of pages) {
      for (const fence of fences(entry.content)) {
        if (!["python", "py"].includes(fence.lang)) {
          continue;
        }
        for (const match of pythonChainMatches(fence.body)) {
          checked += 1;
          const problem = pythonChainProblem(match);
          if (problem) {
            findings.push(`${entry.file}:${fence.line}: ${problem}`);
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(40);
    expect(findings).toEqual([]);
  });
});
