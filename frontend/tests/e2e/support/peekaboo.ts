import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import type { TestInfo } from "@playwright/test";

import { copyToTraceArtifacts } from "../../helpers/traceArtifacts";

type CaptureOpts = {
  name?: string;
  traceRunId?: string;
  traceRoot?: string;
  dryRun?: boolean;
  artifactDir?: string;
  describe?: boolean;
};

export async function capturePeekaboo(
  testInfo: TestInfo,
  opts?: CaptureOpts,
): Promise<{ capturePath: string; artifactPath: string; tracePath: string | null }> {
  const repoRoot = path.resolve(__dirname, "..", "..");
  const captureScript = path.join(repoRoot, "scripts", "peekaboo_capture.sh");
  const uploadScript = path.join(repoRoot, "scripts", "trace_artifact_upload.sh");

  const name = opts?.name ?? "capture";
  const capturePath = testInfo.outputPath(`peekaboo-${name}.png`);
  fs.mkdirSync(path.dirname(capturePath), { recursive: true });

  if (!fs.existsSync(captureScript)) {
    fs.writeFileSync(capturePath, "PEEKABOO_SKIP: capture script missing");
    return { capturePath, artifactPath: capturePath, tracePath: null };
  }

  const env = {
    ...process.env,
    PEEKABOO_DRY_RUN: opts?.dryRun === false ? process.env.PEEKABOO_DRY_RUN ?? "0" : "1",
  };

  const args = [capturePath];
  if (opts?.describe) {
    args.push("--describe");
  }

  spawnSync(captureScript, args, { env, stdio: "ignore" });

  const artifactDir = opts?.artifactDir ?? testInfo.outputPath("peekaboo-artifacts");
  let artifactPath = path.join(artifactDir, path.basename(capturePath));

  if (fs.existsSync(uploadScript)) {
    fs.mkdirSync(artifactDir, { recursive: true });
    spawnSync(uploadScript, [capturePath, path.basename(artifactPath)], {
      env: { ...env, TRACER_ARTIFACT_DIR: artifactDir },
      stdio: "ignore",
    });
  } else {
    fs.mkdirSync(artifactDir, { recursive: true });
    fs.copyFileSync(capturePath, artifactPath);
  }

  if (!fs.existsSync(artifactPath)) {
    artifactPath = capturePath;
  }

  const traceRunId = opts?.traceRunId;
  const traceRoot = opts?.traceRoot;
  const tracePath =
    traceRunId && fs.existsSync(capturePath)
      ? copyToTraceArtifacts(capturePath, { runId: traceRunId, traceRoot })
      : null;

  return { capturePath, artifactPath, tracePath };
}
