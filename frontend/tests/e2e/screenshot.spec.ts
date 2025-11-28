import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const outDir = path.resolve(__dirname, "..", "..", "docs", "images");
const heroLight = path.join(outDir, "ui-hero.png");
const flowsLight = path.join(outDir, "ui-flows.png");
const heroDark = path.join(outDir, "ui-hero-dark.png");
const flowsDark = path.join(outDir, "ui-flows-dark.png");

test("capture hero and flows view screenshots", async ({ page, baseURL }) => {
  fs.mkdirSync(outDir, { recursive: true });

  await page.goto(baseURL || "http://localhost:4173");

  const hero = page.getByTestId("workspace-hero");
  await expect(hero).toBeVisible();
  await page.screenshot({ path: heroLight, fullPage: true });

  const flowsTab = page.getByRole("tab", { name: /Flows/i });
  await flowsTab.click();
  await page.waitForTimeout(300); // allow flows card/layout to settle
  const flowsCard = page.getByTestId("workspace-tabs");
  await expect(flowsCard).toBeVisible();
  await page.screenshot({ path: flowsLight, fullPage: true });

  // Dark mode
  await page.keyboard.press(process.platform === "darwin" ? "Meta+J" : "Control+J");
  await page.waitForTimeout(250);
  await page.screenshot({ path: heroDark, fullPage: true });
  await page.waitForTimeout(250);
  await page.screenshot({ path: flowsDark, fullPage: true });
});
