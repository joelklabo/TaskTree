import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

import { expect, test as base } from "@playwright/test";

import { copyToTraceArtifacts } from "../helpers/traceArtifacts";

const repoRoot = path.resolve(__dirname, "..", "..");
const captureScript = path.join(repoRoot, "scripts", "peekaboo_capture.sh");
const uploadScript = path.join(repoRoot, "scripts", "trace_artifact_upload.sh");

const test = base.extend({});

test.afterEach(async ({}, testInfo) => {
  if (testInfo.status === "passed") {
    return;
  }

  const slug = testInfo.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "capture";
  const capturePath = testInfo.outputPath(`peekaboo-${slug}.png`);
  mkdirSync(path.dirname(capturePath), { recursive: true });

  if (!existsSync(captureScript)) {
    testInfo.attachments.push({
      name: "peekaboo",
      body: Buffer.from("skip: capture script missing"),
      contentType: "text/plain"
    });
    return;
  }

  const proc = spawnSync(captureScript, [capturePath], {
    env: { ...process.env },
    stdio: "inherit"
  });

  if (proc.status !== 0) {
    testInfo.attachments.push({
      name: "peekaboo",
      body: Buffer.from(`capture script failed with status ${proc.status ?? "unknown"}`),
      contentType: "text/plain"
    });
    return;
  }

  if (existsSync(capturePath)) {
    testInfo.attachments.push({
      name: "peekaboo",
      path: capturePath,
      contentType: "image/png"
    });

    // Best-effort: copy into trace artifacts directory for later upload/inspection.
    if (existsSync(uploadScript)) {
      spawnSync(uploadScript, [capturePath, path.basename(capturePath)], {
        env: { ...process.env },
        stdio: "ignore"
      });
    }

    copyToTraceArtifacts(capturePath);
  }
});

export { expect, test };
