import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { withDocsGenerationLock } from "../../scripts/docs-generation-lock";

test("API generation rejects concurrent writers and releases its lock after failure", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ryu-docs-generator-"));
  const path = join(directory, "generation-lock.json");
  try {
    await withDocsGenerationLock(path, async () => {
      expect(JSON.parse(await readFile(path, "utf8")).processId).toBe(
        process.pid,
      );
      let secondWriterRan = false;
      await expect(
        withDocsGenerationLock(path, async () => {
          secondWriterRan = true;
        }),
      ).rejects.toThrow("Documentation generation is already locked");
      expect(secondWriterRan).toBe(false);
    });
    await expect(
      withDocsGenerationLock(path, async () => {
        throw new Error("fixture generation failure");
      }),
    ).rejects.toThrow("fixture generation failure");
    await expect(
      withDocsGenerationLock(path, async () => "ready"),
    ).resolves.toBe("ready");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
