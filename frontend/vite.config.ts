import path from "path";
import fs from "fs";
import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig(async () => {
  const disableChecker = process.env.VITE_DISABLE_CHECKER === "1";
  const backendPort = process.env.BACKEND_PORT || "8000";
  const plugins = [react()];
  if (!disableChecker) {
    const { default: checker } = await import("vite-plugin-checker");
    plugins.push(
      checker({
        typescript: true,
        eslint: {
          // Keep checker fast and self-contained (no pnpm indirection during tests).
          lintCommand: 'eslint "src/**/*.{ts,tsx}" --max-warnings=0'
        }
      })
    );
  }

  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src")
      }
    },
    server: {
      proxy: {
        "/api": {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true,
          ws: true
        }
      },
      fs: {
        allow: [".", "../tmp"]
      },
      // Serve dashboard_state.json from repo tmp (collector output) with fixture fallback.
      configureServer(server) {
        server.middlewares.use("/tmp/dashboard_state.json", (req, res) => {
          const statePath = path.resolve(__dirname, "..", "tmp", "dashboard_state.json");
          const fallback = path.resolve(__dirname, "src", "__tests__", "fixtures", "dashboard_state.json");
          let body: string;
          if (fs.existsSync(statePath)) {
            body = fs.readFileSync(statePath, "utf-8");
          } else {
            body = fs.readFileSync(fallback, "utf-8");
          }
          res.setHeader("Content-Type", "application/json");
          res.end(body);
        });
      }
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./vitest.setup.ts",
      exclude: [...configDefaults.exclude, "tests/e2e/**"],
      coverage: {
        provider: "v8",
        reporter: ["text", "lcov", "json-summary"],
        reportsDirectory: "./coverage"
      }
    }
  };
});
