import { readFileSync, writeFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { BACKUP_FROM_1_0, RECORD_FROM_1_0, RECORD_FROM_1_0_AS_READ } from "../src/persistence/legacy-fixtures";
import { createInvestigation, libraryItem } from "./helpers";

/** The per-kind summary in Settings › Your data. */
const savedData = (page: Page) => page.getByRole("list", { name: "Saved on this device" }).getByRole("listitem");

const NOTHING_SAVED = ["0 research notebooks", "0 investigations", "0 Discovery Cards", "0 Map connections", "0 explored passages and attributes"];
const NO_STUDY_DATA = { progress: [], discoveries: [], personalConnections: [], explorations: [] };

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
  expect(backup).toMatchObject({ format: "gospel-labs-backup", version: 3, study: NO_STUDY_DATA });
  expect(backup.investigations).toHaveLength(1);
  expect(backup.investigations[0]).toMatchObject({
    evidenceConnections: [],
    discoveryHighlights: [],
    challengeResponses: [],
    trailProgress: [],
    christReflection: {},
  });

  // Delete everything (requires acknowledgement, and lists what will go).
  await page.getByRole("button", { name: "Delete all data" }).click();
  const deleteDialog = page.getByRole("dialog", { name: "Delete all data?" });
  await expect(deleteDialog.getByRole("list", { name: "Will be deleted" })).toContainText("1 research notebook");
  await expect(deleteDialog.getByRole("button", { name: "Delete everything" })).toBeDisabled();
  await deleteDialog.getByRole("checkbox", { name: /I understand/ }).check();
  await deleteDialog.getByRole("button", { name: "Delete everything" }).click();
  await expect(page.getByText("Deleted 1 research notebook from this device.")).toBeVisible();
  await expect(savedData(page)).toHaveText(NOTHING_SAVED);

  // Restore.
  await page.locator('input[type="file"]').setInputFiles(backupPath);
  const importDialog = page.getByRole("dialog", { name: "Import backup" });
  await expect(importDialog).toContainText("1 new · 0 updated · 0 unchanged");
  await importDialog.getByRole("button", { name: "Import", exact: true }).click();
  await expect(page.getByText("Imported: 1 new, 0 updated, 0 unchanged.")).toBeVisible();

  // The restored investigation opens with its evidence.
  await page.goto("/library");
  await libraryItem(page, "Grace and works").getByRole("link", { name: /^Resume/ }).click();
  await page.getByRole("navigation", { name: "Notebook sections" }).getByRole("button", { name: /Research/ }).click();
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
  await expect(dialog).toContainText("Research notebooks: 2 deleted · 1 restored");
  await expect(dialog).toContainText("Everything now on this device will be permanently deleted: 2 research notebooks.");
  await expect(dialog.getByRole("button", { name: "Download a backup of my current data" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Replace all data" })).toBeDisabled();
  await dialog.getByRole("checkbox", { name: /I understand/ }).check();
  await dialog.getByRole("button", { name: "Replace all data" }).click();
  await expect(page.getByText("Replaced your data with 1 research notebook from the backup.")).toBeVisible();

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

  await expect(savedData(page).first()).toHaveText("1 research notebook");
});

test("a backup exported by Gospel Labs 1.0 imports with all of its data", async ({ page }, testInfo) => {
  const oldBackup = testInfo.outputPath("gospel-labs-backup-1.0.json");
  writeFileSync(oldBackup, BACKUP_FROM_1_0);

  await page.goto("/settings");
  await page.locator('input[type="file"]').setInputFiles(oldBackup);
  const dialog = page.getByRole("dialog", { name: "Import backup" });
  await expect(dialog).toContainText("made by Gospel Labs 1.x");
  await expect(dialog).toContainText("Research notebooks: 1 new · 0 updated · 0 unchanged");
  await dialog.getByRole("button", { name: "Import", exact: true }).click();
  await expect(page.getByText("Imported: 1 new, 0 updated, 0 unchanged.")).toBeVisible();

  await page.goto("/library");
  await libraryItem(page, RECORD_FROM_1_0.title).getByRole("link", { name: /^Resume/ }).click();
  await expect(page.getByRole("textbox", { name: "Analysis notes" })).toHaveValue(RECORD_FROM_1_0.analysisNotes);
  await expect(page.getByRole("list", { name: "Evidence linked to claim 1" })).toContainText("Luke 9:23");

  // Exporting again writes the current format, with the 1.0 data unchanged.
  const reexported = await exportBackup(page, testInfo.outputPath("reexported.json"));
  expect(reexported.version).toBe(3);
  // Imported by this version, so stamped with its record format.
  expect(reexported.investigations).toEqual([{ ...RECORD_FROM_1_0_AS_READ, dataVersion: 2 }]);
  expect(reexported.study).toEqual(NO_STUDY_DATA);
});
