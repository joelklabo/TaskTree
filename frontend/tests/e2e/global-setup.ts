import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import path from "path";

const shouldUseExternal = process.env.E2E_EXTERNAL === "1";
const skipBackend = process.env.E2E_SKIP_BACKEND === "1";
const backendPort = process.env.E2E_BACKEND_PORT || "8000";

async function waitForHealth(url: string, timeoutMs = 30000, intervalMs = 500): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown = null;
  while (Date.now() < deadline) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), intervalMs);
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (resp.ok) return;
      lastError = new Error(`non-200: ${resp.status}`);
    } catch (err) {
      lastError = err;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Backend health check failed: ${String(lastError)}`);
}

export default async function globalSetup() {
  if (shouldUseExternal || skipBackend) {
    return;
  }

  const backendCwd = path.resolve(__dirname, "..", "..", "..", "backend");
  const backendCmd = ["uv", "run", "uvicorn", "tasktree.api.app:app", "--host", "127.0.0.1", "--port", backendPort];
  const backend: ChildProcessWithoutNullStreams = spawn(backendCmd[0], backendCmd.slice(1), {
    cwd: backendCwd,
    env: { ...process.env, PORT: backendPort },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stdoutBuf = "";
  let stderrBuf = "";
  backend.stdout.on("data", (chunk) => {
    const text = chunk.toString();
    stdoutBuf += text;
    console.log(`[backend] ${text.trimEnd()}`);
  });
  backend.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    stderrBuf += text;
    console.error(`[backend:error] ${text.trimEnd()}`);
  });

  try {
    await waitForHealth(`http://localhost:${backendPort}/health`);
  } catch (err) {
    backend.kill("SIGTERM");
    const extra = [stdoutBuf, stderrBuf].filter(Boolean).join("\n");
    throw new Error(`Backend failed to start: ${err}${extra ? `\n${extra}` : ""}`);
  }

  return async () => {
    if (!backend.killed) {
      backend.kill("SIGTERM");
    }
  };
}
