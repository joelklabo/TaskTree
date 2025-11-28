import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const outDir = path.resolve(__dirname, "..", "..", "docs", "images");
const heroPath = path.join(outDir, "ui-hero.png");
const flowsPath = path.join(outDir, "ui-flows.png");

test("capture hero and flows view screenshots", async ({ page, baseURL }) => {
  fs.mkdirSync(outDir, { recursive: true });

  await page.goto(baseURL || "http://localhost:4173");

  const hero = page.getByTestId("workspace-hero");
  await expect(hero).toBeVisible();
  await page.screenshot({ path: heroPath, fullPage: true });

  const flowsTab = page.getByRole("tab", { name: /Flows/i });
  await flowsTab.click();
  await page.waitForTimeout(300); // allow flows card/layout to settle
  const flowsCard = page.getByTestId("workspace-tabs");
  await expect(flowsCard).toBeVisible();
  await page.screenshot({ path: flowsPath, fullPage: true });
});
