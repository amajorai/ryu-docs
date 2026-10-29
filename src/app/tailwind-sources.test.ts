import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Glob } from "bun";

// Tailwind emits a utility only when a scanned file names it, and an unscanned
// utility fails quietly: the element just renders unstyled. global.css lists
// only the @ryu/ui files the docs render (ui-sources.css) instead of the whole
// package, which put every desktop-only utility in the stylesheet each docs page
// blocks on. This walks the real import graph from apps/fumadocs/src (dynamic
// imports included, so the UI preview module map counts) and fails when a styled
// file it reaches is not covered by an @source. Mirrors apps/web's guard.

const SRC = resolve(import.meta.dir, "..");
const APP = resolve(SRC, "..");
const REPO = resolve(APP, "../..");
const SOURCE_EXTENSION = /\.(ts|tsx)$/;
const CODE_EXTENSION = /\.[cm]?[jt]sx?$/;
const TEST_FILE = /\.(test|spec|stories)\.[cm]?[jt]sx?$|\/(__tests__|e2e)\//;
const STYLED = /\bclassName\b|\bcn\(|\bcva\(/;
const SOURCE_DIRECTIVE = /^@source\s+(not\s+)?"([^"]+)";/gm;
const LOCAL_IMPORT = /^@import\s+"(\.{1,2}\/[^"]+)";/gm;
const GLOB_CHARS = /[*?{]/;

interface SourceRule {
  matches: (file: string) => boolean;
  negated: boolean;
  path: string;
}

function ancestorsOf(file: string): string[] {
  const paths = [file];
  for (
    let dir = dirname(file);
    dir.startsWith(`${REPO}/`);
    dir = dirname(dir)
  ) {
    paths.push(dir);
  }
  return paths;
}

function sourceRule(negated: boolean, path: string): SourceRule {
  // A plain path is a file or a directory.
  if (!GLOB_CHARS.test(path)) {
    const isDirectory = existsSync(path) && statSync(path).isDirectory();
    return {
      negated,
      path,
      matches: (file) =>
        isDirectory ? file.startsWith(`${path}/`) : file === path,
    };
  }
  const glob = new Glob(path);
  return {
    negated,
    path,
    // A pattern naming directories covers what is inside them.
    matches: (file) => ancestorsOf(file).some((entry) => glob.match(entry)),
  };
}

/** @source rules of a stylesheet and of the local stylesheets it imports. */
function rulesOf(cssFile: string): SourceRule[] {
  const css = readFileSync(cssFile, "utf8");
  const own = Array.from(css.matchAll(SOURCE_DIRECTIVE), (match) =>
    sourceRule(Boolean(match[1]), resolve(dirname(cssFile), match[2] ?? "")),
  );
  const imported = Array.from(css.matchAll(LOCAL_IMPORT), (match) =>
    rulesOf(resolve(dirname(cssFile), match[1] ?? "")),
  );
  return [...own, ...imported.flat()];
}

const rules = [
  // @tailwindcss/postcss auto-detects the app it builds (apps/fumadocs).
  sourceRule(false, `${APP}/**/*`),
  ...rulesOf(join(SRC, "app/global.css")),
];

function isCovered(file: string): boolean {
  return (
    rules.some((rule) => !rule.negated && rule.matches(file)) &&
    !rules.some((rule) => rule.negated && rule.matches(file))
  );
}

const tsxTranspiler = new Bun.Transpiler({ loader: "tsx" });
const tsTranspiler = new Bun.Transpiler({ loader: "ts" });
const IMPORT_FALLBACK = /(?:from\s+|import\s*\(\s*|import\s+)["']([^"']+)["']/g;

function importsOf(file: string): string[] {
  const code = readFileSync(file, "utf8");
  const transpiler = file.endsWith("x") ? tsxTranspiler : tsTranspiler;
  try {
    return transpiler.scanImports(code).map((entry) => entry.path);
  } catch {
    // The scanner rejects some valid TSX; fall back to the specifiers.
    return Array.from(
      code.matchAll(IMPORT_FALLBACK),
      (match) => match[1] ?? "",
    );
  }
}

function resolveImport(specifier: string, fromFile: string): string | null {
  try {
    return Bun.resolveSync(specifier, dirname(fromFile));
  } catch {
    return null;
  }
}

/** Every first-party code file reachable from the docs' non-test sources. */
function reachableFiles(): Set<string> {
  const entries = new Glob("**/*.{ts,tsx,js,jsx,mjs}").scanSync({
    cwd: SRC,
    absolute: true,
  });
  const stack = Array.from(entries).filter((file) => !TEST_FILE.test(file));
  const seen = new Set<string>();
  for (let file = stack.pop(); file !== undefined; file = stack.pop()) {
    if (seen.has(file)) {
      continue;
    }
    seen.add(file);
    for (const specifier of importsOf(file)) {
      const target = resolveImport(specifier, file);
      if (
        target?.startsWith(`${REPO}/`) &&
        !target.includes("/node_modules/") &&
        CODE_EXTENSION.test(target)
      ) {
        stack.push(target);
      }
    }
  }
  return seen;
}

/** Tailwind skips gitignored paths even under a matching glob. */
function gitIgnored(files: string[]): Set<string> {
  const result = Bun.spawnSync(
    ["git", "check-ignore", "--no-index", "--stdin"],
    { cwd: REPO, stdin: new TextEncoder().encode(files.join("\n")) },
  );
  // Exit 1 means none of them is ignored.
  if (result.exitCode !== 0 && result.exitCode !== 1) {
    throw new Error(`git check-ignore failed: ${result.stderr.toString()}`);
  }
  return new Set(
    result.stdout
      .toString()
      .split("\n")
      .filter(Boolean)
      .map((file) => resolve(REPO, file)),
  );
}

describe("apps/fumadocs Tailwind sources", () => {
  test("cover every styled file the docs import", () => {
    const styled = Array.from(reachableFiles())
      .filter((file) => SOURCE_EXTENSION.test(file) && !TEST_FILE.test(file))
      .filter((file) => STYLED.test(readFileSync(file, "utf8")));
    const ignored = gitIgnored(styled);
    const namedDirectly = (file: string) =>
      rules.some((rule) => !rule.negated && rule.path === file);

    const uncovered = styled
      .filter((file) =>
        ignored.has(file) ? !namedDirectly(file) : !isCovered(file),
      )
      .map((file) => file.slice(REPO.length + 1))
      .sort();

    expect(
      styled.filter((file) =>
        file.replaceAll("\\", "/").includes("/packages/ui/"),
      ).length,
    ).toBeGreaterThan(100);
    expect(uncovered).toEqual([]);
  }, 60_000);
});
