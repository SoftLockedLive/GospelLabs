import { readFileSync, writeFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { BACKUP_FROM_1_0, RECORD_FROM_1_0 } from "../src/persistence/legacy-fixtures";
import { addEvidence, expectSaved, goToSection, openActivity } from "./helpers";

async function exportBackup(page: Page, path: string) {
  await page.goto("/settings");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export backup" }).click(),
  ]);
  await download.saveAs(path);
  return JSON.parse(readFileSync(path, "utf8"));
}

async function importBackup(page: Page, path: string) {
  await page.goto("/settings");
  await page.locator('input[type="file"]').setInputFiles(path);
  await page.getByRole("dialog", { name: "Import backup" }).getByRole("button", { name: "Import", exact: true }).click();
  await expect(page.getByText(/^Imported:/)).toBeVisible();
}

const byId = (list: { id: string }[]) => [...list].sort((a, b) => a.id.localeCompare(b.id));

test("a 1.0 backup imports into 1.1, and every 1.1 field survives export and import", async ({ page }, testInfo) => {
  // A backup exported by Gospel Labs 1.0.
  const fromV1 = testInfo.outputPath("from-1.0.json");
  writeFileSync(fromV1, BACKUP_FROM_1_0);
  await importBackup(page, fromV1);

  // Use every 1.1 feature on the imported investigation.
  await page.goto(`/investigations/view?id=${RECORD_FROM_1_0.id}`);
  await goToSection(page, "Research");
  await addEvidence(page, "Mark 8:34", "Let him deny himself, and take up his cross.");
  await openActivity(page, "Connections");
  await page.getByRole("button", { name: "Create connection" }).click();
  const form = page.getByRole("form", { name: "New connection" });
  await form.getByRole("combobox", { name: "First piece of evidence" }).selectOption({ index: 1 });
  await form.locator("label").filter({ hasText: "Supports" }).click();
  await form.getByRole("combobox", { name: "Second piece of evidence" }).selectOption({ index: 1 });
  await form.getByRole("textbox", { name: "Explanation" }).fill("Both describe taking up the cross.");
  await form.getByRole("button", { name: "Create connection" }).click();
  await openActivity(page, "Challenges");
  await page.getByRole("textbox", { name: "Your response" }).fill("“Daily” stands out.");
  await page.getByRole("button", { name: /^Save discovery/ }).click();
  const dialog = page.getByRole("dialog", { name: "Save a discovery" });
  await dialog.getByRole("textbox", { name: "Title" }).fill("Discipleship is daily");
  await dialog.getByRole("checkbox", { name: /^E1/ }).check();
  await dialog.getByRole("button", { name: "Save discovery" }).click();
  await goToSection(page, "Conclusion");
  await page.getByRole("textbox", { name: "What have you learned about Jesus Christ?" }).fill("He asks for daily discipleship.");
  await expectSaved(page);

  // And a discovery trail, on a new investigation from the curated question.
  await page.goto("/investigations/new?question=forgiveness-before-the-atonement");
  await page.getByRole("textbox", { name: "Context" }).fill("For a lesson.");
  await goToSection(page, "Research");
  await page.getByRole("textbox", { name: "Your discoveries" }).fill("Verse 10 ties healing to forgiveness.");
  await page.getByRole("checkbox", { name: /explored this step/ }).check();
  await expectSaved(page);

  const first = await exportBackup(page, testInfo.outputPath("first.json"));
  expect(first.version).toBe(2);
  const legacy = first.investigations.find((i: { id: string }) => i.id === RECORD_FROM_1_0.id);
  expect(legacy).toMatchObject({
    dataVersion: 2,
    analysisNotes: RECORD_FROM_1_0.analysisNotes,
    remainingQuestions: RECORD_FROM_1_0.remainingQuestions,
    claims: RECORD_FROM_1_0.claims,
    evidenceConnections: [expect.objectContaining({ relationship: "supports" })],
    challengeResponses: [expect.objectContaining({ response: "“Daily” stands out." })],
    discoveryHighlights: [expect.objectContaining({ title: "Discipleship is daily", evidenceIds: ["ev-legacy"] })],
    christReflection: { "learned-about-christ": "He asks for daily discipleship." },
    researchActivity: "challenges",
  });
  const trail = first.investigations.find((i: { id: string }) => i.id !== RECORD_FROM_1_0.id);
  expect(trail.trailProgress[0].steps[0]).toMatchObject({ discoveries: "Verse 10 ties healing to forgiveness.", explored: true });

  // Delete everything, restore from that export, and export again: nothing changes.
  await page.getByRole("button", { name: "Delete all data" }).click();
  const deleteDialog = page.getByRole("dialog", { name: "Delete all data?" });
  await deleteDialog.getByRole("checkbox").check();
  await deleteDialog.getByRole("button", { name: "Delete everything" }).click();
  await expect(page.getByText("0 investigations saved on this device.")).toBeVisible();
  await importBackup(page, testInfo.outputPath("first.json"));
  const second = await exportBackup(page, testInfo.outputPath("second.json"));
  expect(byId(second.investigations)).toEqual(byId(first.investigations));
});
