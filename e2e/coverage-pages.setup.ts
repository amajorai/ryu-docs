import { mkdir } from "node:fs/promises";
import path from "node:path";

export default async function setupProofDirectory(): Promise<void> {
  const directory = process.env.RYU_FUMADOCS_COVERAGE_PROOF_DIR ?? "";
  if (!directory || !path.isAbsolute(directory)) {
    throw new Error(
      "RYU_FUMADOCS_COVERAGE_PROOF_DIR must be a fresh absolute directory",
    );
  }
  // Run once per invocation, including when a failed test restarts its worker.
  // Existing historical output still fails before any browser journey runs.
  await mkdir(directory);
}
