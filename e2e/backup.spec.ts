import { readFileSync, writeFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { createInvestigation, libraryItem } from "./helpers";

async function exportBackup(page: Page, path: string) {
  await page.goto("/settings");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export backup" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^gospel-labs-backup-\d{4}-\d{2}-\d{2}\.json$/);
  await download.saveAs(path);
  return JSON.parse(readFileSync(path, "utf8"));
}

test("export, delete everything, and restore with merge", async ({ page }, testInfo) => {
  await createInvestigation(page, "Grace and works");
  const backupPath = testInfo.outputPath("backup.json");
  const backup = await exportBackup(page, backupPath);
  expect(backup).toMatchObject({ format: "gospel-labs-backup", version: 1 });
  expect(backup.investigations).toHaveLength(1);

  // Delete everything (requires acknowledgement).
  await page.getByRole("button", { name: "Delete all data" }).click();
  const deleteDialog = page.getByRole("dialog", { name: "Delete all data?" });
  await expect(deleteDialog.getByRole("button", { name: "Delete everything" })).toBeDisabled();
  await deleteDialog.getByRole("checkbox").check();
  await deleteDialog.getByRole("button", { name: "Delete everything" }).click();
  await expect(page.getByText("0 investigations saved on this device.")).toBeVisible();

  // Restore.
  await page.locator('input[type="file"]').setInputFiles(backupPath);
  const importDialog = page.getByRole("dialog", { name: "Import backup" });
  await expect(importDialog).toContainText("1 new · 0 updated · 0 unchanged");
  await importDialog.getByRole("button", { name: "Import", exact: true }).click();
  await expect(page.getByText("Imported: 1 new, 0 updated, 0 unchanged.")).toBeVisible();

  // The restored investigation opens with its evidence.
  await page.goto("/library");
  await libraryItem(page, "Grace and works").getByRole("link", { name: /^Resume/ }).click();
  await page.getByRole("navigation", { name: "Investigation sections" }).getByRole("button", { name: /Research/ }).click();
  await expect(page.getByText("Following Christ is described as a daily choice.").filter({ visible: true })).toBeVisible();
});

test("replace warns before deleting current data", async ({ page }, testInfo) => {
  await createInvestigation(page, "Kept in backup");
  const backupPath = testInfo.outputPath("backup.json");
  await exportBackup(page, backupPath);
  await createInvestigation(page, "Created after backup");

  await page.goto("/settings");
  await page.locator('input[type="file"]').setInputFiles(backupPath);
  const dialog = page.getByRole("dialog", { name: "Import backup" });
  await dialog.getByText("Replace all my data").click();
  await expect(dialog).toContainText("Your current 2 investigations will be permanently deleted.");
  await expect(dialog.getByRole("button", { name: "Replace all data" })).toBeDisabled();
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Replace all data" }).click();
  await expect(page.getByText("Replaced your data with 1 investigation from the backup.")).toBeVisible();

  await page.goto("/library");
  await expect(libraryItem(page, "Kept in backup")).toBeVisible();
  await expect(libraryItem(page, "Created after backup")).toHaveCount(0);
});

test("damaged and incompatible files are rejected without changing data", async ({ page }, testInfo) => {
  await createInvestigation(page, "Untouched");
  const backupPath = testInfo.outputPath("backup.json");
  const backup = await exportBackup(page, backupPath);

  const truncated = testInfo.outputPath("truncated.json");
  writeFileSync(truncated, readFileSync(backupPath, "utf8").slice(0, 200));
  await page.locator('input[type="file"]').setInputFiles(truncated);
  await expect(page.getByRole("alert").filter({ hasText: "isn't valid JSON" })).toBeVisible();

  const newer = testInfo.outputPath("newer.json");
  writeFileSync(newer, JSON.stringify({ ...backup, version: 99 }));
  await page.locator('input[type="file"]').setInputFiles(newer);
  await expect(page.getByRole("alert").filter({ hasText: "newer version of Gospel Labs" })).toBeVisible();

  await expect(page.getByText("1 investigation saved on this device.")).toBeVisible();
});
