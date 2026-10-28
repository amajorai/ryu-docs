import { mkdir, open, unlink } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";

const existingLockContract = z.object({ code: z.literal("EEXIST") });
const existingLockSchema = z.custom<Error & { code: "EEXIST" }>(
  (value) =>
    value instanceof Error && existingLockContract.safeParse(value).success,
);

/** Keep concurrent API generators from deleting another run's output. */
export async function withDocsGenerationLock<T>(
  path: string,
  generate: () => Promise<T>,
): Promise<T> {
  await mkdir(dirname(path), { recursive: true });
  const lock = await open(path, "wx").catch(
    (error: Parameters<typeof existingLockSchema.safeParse>[0]) => {
      if (existingLockSchema.safeParse(error).success) {
        throw new Error(
          `Documentation generation is already locked at ${path}. Wait for the active generator; remove a stale lock only after checking that its process has stopped.`,
        );
      }
      throw error;
    },
  );
  try {
    await lock.writeFile(JSON.stringify({ processId: process.pid }));
    return await generate();
  } finally {
    await lock.close();
    await unlink(path);
  }
}
