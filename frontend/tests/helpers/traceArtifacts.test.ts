import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, test, afterEach, beforeEach } from "vitest";

import { copyToTraceArtifacts } from "./traceArtifacts";

const KEEP_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...KEEP_ENV };
});

afterEach(() => {
  process.env = { ...KEEP_ENV };
});

describe("copyToTraceArtifacts", () => {
  test("copies file into trace run artifacts when env is set", () => {
    const srcDir = fs.mkdtempSync(path.join(os.tmpdir(), "peekaboo-src-"));
    const src = path.join(srcDir, "capture.png");
    fs.writeFileSync(src, "PNGDATA");

    const traceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "trace-root-"));
    process.env.TASKTREE_TRACE_RUN_ID = "run123";
    process.env.TASKTREE_TRACE_ROOT = traceRoot;

    const dest = copyToTraceArtifacts(src);

    const expected = path.join(traceRoot, "run123", "artifacts", "peekaboo", "capture.png");
    expect(dest).toBe(expected);
    expect(fs.existsSync(expected)).toBe(true);
    expect(fs.readFileSync(expected, "utf-8")).toBe("PNGDATA");
  });

  test("no-op when run id is missing", () => {
    const srcDir = fs.mkdtempSync(path.join(os.tmpdir(), "peekaboo-src-"));
    const src = path.join(srcDir, "capture.png");
    fs.writeFileSync(src, "PNGDATA");

    delete process.env.TASKTREE_TRACE_RUN_ID;
    const dest = copyToTraceArtifacts(src);

    expect(dest).toBeNull();
  });
});
