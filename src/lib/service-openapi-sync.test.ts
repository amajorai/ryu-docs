import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { SERVICE_REFERENCES } from "../../scripts/api-reference-specs";

// The vendored copies in specs/services/ match apps/web/public/openapi/. The
// sync script lives at the repository root, which the published docs
// satellite does not carry; there these checks do not apply, and the rest of
// the reference guard (service-openapi-docs.test.ts) still runs.

const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const script = join(repoRoot, "scripts", "sync-service-openapi.mjs");

interface SyncModule {
  compare(): Promise<{ orphaned: string[]; stale: string[] }>;
  EXCLUDED: string[];
  serviceDocuments(): Promise<string[]>;
}

async function loadSync(): Promise<SyncModule> {
  // Computed path so the docs type check does not compile the root script.
  return (await import(script)) as SyncModule;
}

describe.if(existsSync(script))("service OpenAPI vendoring", () => {
  test("vendors every standalone service document and nothing else", async () => {
    const sync = await loadSync();
    const documents = await sync.serviceDocuments();
    expect(sync.EXCLUDED).toEqual(["v1.json"]);
    expect(documents).toEqual(
      SERVICE_REFERENCES.map((service) => `${service.id}.json`).sort(),
    );
    expect(await sync.compare()).toEqual({ stale: [], orphaned: [] });
  });

  test("the sync script's --check agrees with compare()", () => {
    const result = spawnSync("node", [script, "--check"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    expect({ status: result.status, stderr: result.stderr }).toEqual({
      status: 0,
      stderr: "",
    });
    const misuse = spawnSync("node", [script, "--bogus"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    expect(misuse.status).toBe(2);
  });
});
