import { afterAll, beforeAll, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import { GET, revalidate } from "./route";

const repoRoot = fileURLToPath(new URL("../../../../../../", import.meta.url));
const appDir = fileURLToPath(new URL("../../../../", import.meta.url));
const schemaFile = fileURLToPath(
  new URL("../../../../specs/plugin-schema.json", import.meta.url),
);
const coreHookPhases = `${repoRoot}apps/core/src/plugin_host/mod.rs`;
const FIRST_PARTY_MANIFESTS = [
  "apps-store/*/manifest.json",
  "plugins-store/{plugins,lsp,external_plugins}/*/manifest.json",
  "apps/core/src/plugin_manifest/fixtures/*.manifest.json",
];

// The route reads `specs/plugin-schema.json` from the process working directory,
// which is the app directory wherever Next.js serves it. Pin that directory here
// so the case also passes when `bun test` is started from the repository root.
const startingDirectory = process.cwd();
beforeAll(() => {
  process.chdir(appDir);
});
afterAll(() => {
  process.chdir(startingDirectory);
});

const onPhaseSchema = z.object({
  oneOf: z.tuple([
    z.object({ enum: z.array(z.string()) }),
    z.object({ pattern: z.string() }),
  ]),
});
const servedSchema = z.object({
  $defs: z.object({
    TurnHookContribution: z.object({
      properties: z.object({ on: onPhaseSchema }),
    }),
  }),
  $id: z.string(),
  $schema: z.string(),
});
const manifestHooks = z.object({
  contributes: z
    .object({
      turn_hooks: z.array(z.object({ on: z.string() })).optional(),
    })
    .optional(),
});

async function served() {
  const response = await GET();
  const text = await response.text();
  return {
    response,
    schema: servedSchema.parse(JSON.parse(text)),
    text,
  };
}

test("serves the checked-in manifest schema as cacheable JSON Schema at its own $id", async () => {
  const { response, schema, text } = await served();

  expect(revalidate).toBe(false);
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("application/schema+json");
  expect(response.headers.get("cache-control")).toBe("public, max-age=86400");
  expect(text).toBe(await Bun.file(schemaFile).text());
  expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
  expect(new URL(schema.$id).pathname).toBe("/schemas/plugin.json");
});

test("the served turn-hook phases are exactly the phases Core declares", async () => {
  const { schema } = await served();
  const core = await Bun.file(coreHookPhases).text();
  const declared = [
    ...core.matchAll(/^pub const ON_[A-Z_]+: &str = "([a-z_]+)";$/gm),
  ].map((match) => match[1]);
  const phases = schema.$defs.TurnHookContribution.properties.on.oneOf[0].enum;

  expect(declared.length).toBeGreaterThan(0);
  expect([...phases].sort()).toEqual([...declared].sort());
});

test("every first-party manifest's turn-hook phase validates against the served schema", async () => {
  const { schema } = await served();
  const [builtIn, appEvent] =
    schema.$defs.TurnHookContribution.properties.on.oneOf;
  const appEventPattern = new RegExp(appEvent.pattern);
  const rejected: string[] = [];
  let hooks = 0;

  for (const pattern of FIRST_PARTY_MANIFESTS) {
    for await (const file of new Bun.Glob(pattern).scan(repoRoot)) {
      const manifest = manifestHooks.parse(
        JSON.parse(await Bun.file(`${repoRoot}${file}`).text()),
      );
      for (const hook of manifest.contributes?.turn_hooks ?? []) {
        hooks += 1;
        // `oneOf`: exactly one branch may match.
        const matches =
          Number(builtIn.enum.includes(hook.on)) +
          Number(appEventPattern.test(hook.on));
        if (matches !== 1) {
          rejected.push(`${file}: ${hook.on}`);
        }
      }
    }
  }

  expect(hooks).toBeGreaterThan(0);
  expect(rejected).toEqual([]);
});
