import fs from "node:fs";
import path from "node:path";

/**
 * Copy a local artifact (e.g., Peekaboo capture) into the TaskTree trace artifact tree.
 * Returns the destination path when a trace run id is available; otherwise null.
 */
export function copyToTraceArtifacts(
  sourcePath: string,
  opts?: { runId?: string; traceRoot?: string; subdir?: string },
): string | null {
  const runId = opts?.runId ?? process.env.TASKTREE_TRACE_RUN_ID;
  if (!runId) {
    return null;
  }

  if (!fs.existsSync(sourcePath)) {
    return null;
  }

  const repoRoot = path.resolve(__dirname, "..", "..");
  const traceRoot =
    opts?.traceRoot ??
    process.env.TASKTREE_TRACE_ROOT ??
    path.join(repoRoot, "backend", "tasktree", "agents", "trace", "runs");
  const subdir = opts?.subdir ?? "peekaboo";

  const destDir = path.join(traceRoot, runId, "artifacts", subdir);
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, path.basename(sourcePath));
  fs.copyFileSync(sourcePath, dest);
  return dest;
}
