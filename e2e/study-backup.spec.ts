/**
 * A full backup round trip with study data made through the app itself:
 * an investigation in progress, a finished investigation's Discovery Card
 * with a note, a personal Map connection, explorations (an attribute word and
 * a passage highlight), and appearance and study preferences. Export, delete
 * everything, import: every record comes back exactly, and the app shows it.
 */
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import type { DiscoveryCard } from "@/domain/study/user-data";
import { completeInvestigation, pathSteps, pick, readStore, solveStep, startInvestigation } from "./study-helpers";

const STORES = ["investigations", "studyProgress", "discoveries", "personalConnections", "explorations"] as const;

async function snapshot(page: Page) {
  const all: Record<string, unknown[]> = {};
  for (const store of STORES) {
    all[store] = [...(await readStore<{ id: string }>(page, store))].sort((a, b) => a.id.localeCompare(b.id));
  }
  return all;
}

const savedData = (page: Page) => page.getByRole("list", { name: "Saved on this device" }).getByRole("listitem");

test("study data and preferences made in the app survive export, delete everything, and import", async ({ page }, testInfo) => {
  // A finished investigation, with a note on its card.
  await completeInvestigation(page, "one-by-one", { difficulty: "easy", length: "quick" });
  await page.getByRole("textbox", { name: /Your note/ }).fill("Each one, by name.");
  await expect(page.getByText("Saved on this device").first()).toBeVisible();
  // An investigation in progress.
  const inProgress = await startInvestigation(page, "again-and-again", { difficulty: "easy", length: "quick" });
  await solveStep(page, pathSteps(inProgress, "quick")[0], "easy");
  // An attribute word opened, and a passage highlight.
  await page.goto("/character/meekness");
  await page.getByRole("region", { name: "Words to know" }).getByRole("button").first().click();
  await expect(page.getByText("Explored · 1 word", { exact: true })).toBeVisible();
  await page.goto("/explore/he-will-take-upon-him");
  const words = page.getByRole("group", { name: /words you can highlight/ });
  await words.locator('[data-verse="12"]').getByRole("button", { name: "succor", exact: true }).click();
  await page.getByRole("button", { name: "Save highlight" }).click();
  await expect(page.getByRole("region", { name: /^Your highlights/ }).getByRole("listitem")).toHaveCount(1);
  // A connection of the learner's own on the Map.
  const [card] = await readStore<DiscoveryCard>(page, "discoveries");
  await page.goto("/map");
  await page.getByRole("button", { name: "Add a connection" }).click();
  const dialog = page.getByRole("dialog", { name: "Connect two things on your Map" });
  await dialog.getByRole("group", { name: "From" }).getByRole("radio", { name: new RegExp(`^${card.concepts[0].label}( |$)`) }).check();
  await dialog.getByRole("group", { name: "To" }).getByRole("radio", { name: new RegExp(`^${card.concepts[1].label}( |$)`) }).check();
  await dialog.getByRole("textbox", { name: /Why you see this connection/ }).fill("Mine to remember.");
  await dialog.getByRole("button", { name: "Add connection" }).click();
  await expect(dialog).toBeHidden();
  // Preferences: Parchment, Hard, motion Off.
  await page.goto("/settings");
  await pick(page.getByRole("group", { name: "Theme" }).getByRole("radio", { name: /^Parchment/ }));
  await pick(page.getByRole("group", { name: "Default difficulty" }).getByRole("radio", { name: /^Hard/ }));
  await pick(page.getByRole("group", { name: "Motion" }).getByRole("radio", { name: /^Off/ }));
  await expect(savedData(page)).toHaveText(["0 research notebooks", "2 investigations", "1 Discovery Card", "1 Map connection", "2 explored passages and attributes"]);
  const before = await snapshot(page);

  // Export.
  const path = testInfo.outputPath("study-backup.json");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export backup" }).click()]);
  await download.saveAs(path);
  const backup = JSON.parse(readFileSync(path, "utf8"));
  expect(backup).toMatchObject({ format: "gospel-labs-backup", version: 3, preferences: { theme: "dawn", difficulty: "hard", motion: "off" } });

  // Delete everything (preferences stay), then change the theme so restoring it can be seen.
  await page.getByRole("button", { name: "Delete all data" }).click();
  const confirm = page.getByRole("dialog", { name: "Delete all data?" });
  await confirm.getByRole("checkbox", { name: /I understand/ }).check();
  await confirm.getByRole("button", { name: "Delete everything" }).click();
  await expect(savedData(page)).toHaveText(["0 research notebooks", "0 investigations", "0 Discovery Cards", "0 Map connections", "0 explored passages and attributes"]);
  await pick(page.getByRole("group", { name: "Theme" }).getByRole("radio", { name: /^Lab/ }));
  await pick(page.getByRole("group", { name: "Default difficulty" }).getByRole("radio", { name: /^Easy/ }));
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  // Import, restoring preferences too.
  await page.locator('input[type="file"]').setInputFiles(path);
  const importDialog = page.getByRole("dialog", { name: "Import backup" });
  await expect(importDialog).toContainText("Discovery Cards: 1 new · 0 updated · 0 unchanged");
  await importDialog.getByRole("checkbox", { name: /Also restore appearance and study preferences/ }).check();
  await importDialog.getByRole("button", { name: "Import", exact: true }).click();
  await expect(page.getByText(/^Imported: 6 new, 0 updated, 0 unchanged\. Appearance and study preferences restored\.$/)).toBeVisible();
  await expect(savedData(page)).toHaveText(["0 research notebooks", "2 investigations", "1 Discovery Card", "1 Map connection", "2 explored passages and attributes"]);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dawn");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
  await expect(page.getByRole("group", { name: "Default difficulty" }).getByRole("radio", { name: /^Hard/ })).toBeChecked();
  // Every record exactly as it was.
  expect(await snapshot(page)).toEqual(before);

  // And the app shows it all again.
  await page.goto("/");
  await expect(page.getByRole("region", { name: "What would you like to study today?" }).getByRole("heading", { level: 2 })).toHaveText(inProgress.title);
  await expect(page.getByRole("region", { name: "Your discoveries" })).toContainText(card.title);
  await page.goto(`/notebook?card=${card.id}`);
  await expect(page.getByRole("textbox", { name: /Your notes/ })).toHaveValue("Each one, by name.");
  await page.goto(`/map?node=${encodeURIComponent(card.concepts[0].ref)}`);
  await expect(page.getByRole("complementary", { name: card.concepts[0].label })).toContainText("Mine to remember.");
  await page.goto("/character");
  await expect(page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Meekness", exact: true }) })).toContainText("Explored · 1 word");
  await page.goto("/explore/he-will-take-upon-him");
  await expect(page.getByRole("region", { name: /^Your highlights/ }).getByRole("listitem").locator("mark")).toHaveText("succor");
});
