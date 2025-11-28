const path = require('node:path');
const { defineConfig } = require('@playwright/test');

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:4173';
const useExternalServer = process.env.E2E_EXTERNAL === '1';
const testDir = path.join(__dirname, 'tests', 'e2e');
const testMatch = '**/*.spec.ts';

console.log('[playwright-config.cjs] cwd:', process.cwd(), 'testDir:', testDir, 'testMatch:', testMatch);

module.exports = defineConfig({
  testDir,
  testMatch,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  globalSetup: './tests/e2e/global-setup.ts',
  reporter: process.env.CI === 'true'
    ? [['line'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : 'list',
  outputDir: 'test-results',
  use: {
    baseURL,
    headless: true,
    trace: 'on-first-retry'
  },
  webServer: useExternalServer ? undefined : {
    command: 'npm run dev -- --host --port 4173',
    url: baseURL,
    reuseExistingServer: true,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 120_000,
  },
});
