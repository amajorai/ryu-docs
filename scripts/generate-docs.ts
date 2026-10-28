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
import { generateFiles } from "fumadocs-openapi";
import { createOpenAPI } from "fumadocs-openapi/server";

import {
  ALL_SPECS,
  apiNavigation,
  CONTENT_ROOT,
  deploymentNote,
  groupLandingPage,
  landingPage,
  orphanedServiceEntries,
  type ReferenceSpec,
  SERVICE_SPECS,
  SERVICES_SURFACE,
  selectSpecs,
  serviceReferenceRootFiles,
} from "./api-reference-specs";
import { withDocsGenerationLock } from "./docs-generation-lock";

/**
 * Generate the interactive API reference pages from the OpenAPI specs.
 *
 * Each spec is generated into its own folder so tag groups never collide across
 * schemas (several surfaces have, e.g., a "Health" or "Service" tag). One page
 * per operation, grouped into folders by tag. The generated `<APIPage />`
 * bodies are rendered at request time by the shared server in
 * `src/lib/openapi.ts` — keep the input paths identical between that file and
 * `scripts/api-reference-specs.ts`.
 *
 * A folder is only routable when it has an `index.mdx`; without one the surface
 * roots (`.../gateway`, `.../core`) 404 even though the parent api-reference
 * page links straight to them. `fumadocs-openapi`'s built-in `index` option
 * skips group (tag-folder) entries, which is everything when `groupBy: "tag"`,
 * so we build the compact surface and tag landing pages ourselves in
 * `beforeWrite` instead.
 *
 * `--surface=<id>` regenerates one surface (`gateway`, `core`, or a service id
 * such as `box`); `--surface=services` regenerates every standalone service
 * reference. Selecting any service also rewrites the `standalone/sdk/reference`
 * index and sidebar, and removes service folders no current service generates.
 * `--check` writes nothing: it generates into a temporary directory and exits
 * non-zero when the committed pages differ or an orphaned service folder
 * remains. Run `--check` with the `--surface` you changed: a surface whose
 * spec moved without a regeneration reports drift that is not yours.
 */
const API_DIR = path.join(CONTENT_ROOT, "extend", "develop", "api-reference");
const USAGE = `Usage: bun scripts/generate-docs.ts [--check] [--surface=${[
  ...ALL_SPECS.map((spec) => spec.out),
  SERVICES_SURFACE,
].join("|")}]`;

function parseArgs(args: readonly string[]): {
  check: boolean;
  specs: ReferenceSpec[];
} {
  const check = args.includes("--check");
  const rest = args.filter((arg) => arg !== "--check");
  const surfaceFlag = rest[0];
  const surface = surfaceFlag?.startsWith("--surface=")
    ? surfaceFlag.slice("--surface=".length)
    : undefined;
  const specs = selectSpecs(surface);
  if (
    rest.length > 1 ||
    (surfaceFlag !== undefined && surface === undefined) ||
    specs.length === 0
  ) {
    throw new Error(USAGE);
  }
  return { check, specs };
}

/** Write one spec's pages into `contentRoot/<spec.dir>`. */
async function generateSpec(spec: ReferenceSpec, contentRoot: string) {
  const output = path.join(contentRoot, ...spec.dir);
  // Drop previously generated pages so removed endpoints don't linger.
  await rm(output, { recursive: true, force: true });

  const server = createOpenAPI({ input: [spec.input] });
  await generateFiles({
    input: server,
    output,
    per: "operation",
    groupBy: "tag",
    includeDescription: true,
    meta: true,
    beforeWrite(files) {
      const entries = Object.values(this.generatedEntries).flat();
      const operations = new Map<string, { method: string; path: string }>();
      const collect = (list: typeof entries) => {
        for (const entry of list) {
          if (entry.type === "group") {
            collect(entry.entries);
          } else if (entry.type === "operation") {
            operations.set(entry.path.split(path.sep).join("/"), entry.item);
          }
        }
      };
      collect(entries);
      for (const file of files) {
        const normalizedPath = file.path.split(path.sep).join("/");
        if (
          !normalizedPath.endsWith(".mdx") ||
          normalizedPath === "index.mdx" ||
          normalizedPath.endsWith("/index.mdx")
        ) {
          continue;
        }
        const group = path.posix.dirname(normalizedPath);
        const item = operations.get(normalizedPath);
        const note = item ? deploymentNote(spec, item) : undefined;
        const notice = note ? `${note}\n\n` : "";
        file.content = `${file.content.trimEnd()}\n\n${notice}${apiNavigation(
          spec,
          group,
        )}\n`;
      }
      // `path` is relative to `output`, so this writes `<output>/index.mdx`.
      files.push({ path: "index.mdx", content: landingPage(spec, entries) });
      for (const entry of entries) {
        if (entry.type === "group") {
          files.push({
            path: path.join(entry.path, "index.mdx"),
            content: groupLandingPage(spec, entry),
          });
        }
      }
    },
  });
}

async function writeServiceRoot(contentRoot: string) {
  for (const file of serviceReferenceRootFiles()) {
    const target = path.join(contentRoot, file.path);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, file.content, "utf8");
  }
}

function includesAnyService(specs: readonly ReferenceSpec[]): boolean {
  return SERVICE_SPECS.some((service) => specs.includes(service));
}

async function generate(specs: readonly ReferenceSpec[], contentRoot: string) {
  for (const spec of specs) {
    await generateSpec(spec, contentRoot);
  }
  if (includesAnyService(specs)) {
    await writeServiceRoot(contentRoot);
  }
}

/** Delete the service reference entries no current service generates. */
async function removeOrphanedServiceEntries(contentRoot: string) {
  for (const entry of orphanedServiceEntries(contentRoot)) {
    await rm(path.join(contentRoot, entry), { recursive: true, force: true });
  }
}

async function listTree(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true }).catch(
    () => [],
  );
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return (await listTree(full)).map((child) =>
          path.join(entry.name, child),
        );
      }
      return entry.name.startsWith(".") ? [] : [entry.name];
    }),
  );
  return nested.flat().sort();
}

/** Paths below `content/docs` whose committed bytes differ from a fresh run. */
async function drift(
  specs: readonly ReferenceSpec[],
  freshRoot: string,
): Promise<string[]> {
  const roots = specs.map((spec) => path.join(...spec.dir));
  const withServices = includesAnyService(specs);
  const singleFiles = withServices
    ? serviceReferenceRootFiles().map((file) => file.path)
    : [];
  const problems: string[] = withServices
    ? orphanedServiceEntries(CONTENT_ROOT).map(
        (entry) => `${entry} (no longer generated)`,
      )
    : [];
  const compare = async (relativePath: string) => {
    const [committed, fresh] = await Promise.all([
      readFile(path.join(CONTENT_ROOT, relativePath), "utf8").catch(() => null),
      readFile(path.join(freshRoot, relativePath), "utf8").catch(() => null),
    ]);
    if (committed !== fresh) {
      problems.push(
        committed === null
          ? `${relativePath} (missing)`
          : fresh === null
            ? `${relativePath} (no longer generated)`
            : relativePath,
      );
    }
  };
  for (const root of roots) {
    const files = new Set([
      ...(await listTree(path.join(CONTENT_ROOT, root))),
      ...(await listTree(path.join(freshRoot, root))),
    ]);
    for (const file of [...files].sort()) {
      await compare(path.join(root, file));
    }
  }
  for (const file of singleFiles) {
    await compare(file);
  }
  return problems;
}

/** The `--surface` flag that regenerates exactly the checked specs. */
function surfaceArgument(specs: readonly ReferenceSpec[]): string {
  if (specs.length === ALL_SPECS.length) {
    return "";
  }
  if (
    specs.length === SERVICE_SPECS.length &&
    SERVICE_SPECS.every((service) => specs.includes(service))
  ) {
    return ` --surface=${SERVICES_SURFACE}`;
  }
  return specs.length === 1 ? ` --surface=${specs[0]?.out}` : "";
}

async function check(specs: readonly ReferenceSpec[]) {
  const freshRoot = await mkdtemp(path.join(tmpdir(), "ryu-api-reference-"));
  // fumadocs-openapi logs every file it writes; the temporary paths are noise.
  const log = console.log;
  console.log = () => undefined;
  try {
    await generate(specs, freshRoot);
  } finally {
    console.log = log;
  }
  try {
    const problems = await drift(specs, freshRoot);
    if (problems.length > 0) {
      process.stderr.write(
        `Generated API reference pages are stale:\n${problems
          .map((problem) => `  ${path.join(CONTENT_ROOT, problem)}`)
          .join(
            "\n",
          )}\nRun: bun run --cwd apps/fumadocs generate:docs${surfaceArgument(
          specs,
        )}\n`,
      );
      process.exitCode = 1;
      return;
    }
    process.stdout.write(
      `Generated API reference pages are current: ${specs
        .map((spec) => spec.out)
        .join(", ")}\n`,
    );
  } finally {
    await rm(freshRoot, { recursive: true, force: true });
  }
}

async function main() {
  const { check: checkOnly, specs } = parseArgs(process.argv.slice(2));
  if (checkOnly) {
    await check(specs);
    return;
  }
  await withDocsGenerationLock(
    path.join(API_DIR, ".generation-lock.json"),
    async () => {
      await generate(specs, CONTENT_ROOT);
      if (includesAnyService(specs)) {
        await removeOrphanedServiceEntries(CONTENT_ROOT);
      }
    },
  );
}

main().catch((error) => {
  process.exitCode = 1;
  throw error;
});
