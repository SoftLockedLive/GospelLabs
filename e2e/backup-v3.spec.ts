/**
 * Backups of Gospel Labs 2.0 data (format version 3): study data seeded
 * straight into the app's IndexedDB survives export, delete everything, and
 * import exactly; preferences are restored only when asked; Replace lists
 * what it will delete, including study data a 1.x backup doesn't have.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import {
  BACKUP_FROM_1_1,
  BACKUP_FROM_2_0,
  CARD_FROM_2_0,
  PREFERENCES_FROM_2_0,
  RECORD_FROM_1_1,
  STUDY_FROM_2_0,
} from "../src/persistence/legacy-fixtures";

const STORES = {
  progress: "studyProgress",
  discoveries: "discoveries",
  personalConnections: "personalConnections",
  explorations: "explorations",
} as const;
type Kind = keyof typeof STORES;
const KINDS = Object.keys(STORES) as Kind[];

/** The per-kind summary in Settings › Your data. */
const savedData = (page: Page) => page.getByRole("list", { name: "Saved on this device" }).getByRole("listitem");

const NOTHING_SAVED = ["0 research notebooks", "0 investigations", "0 Discovery Cards", "0 Map connections", "0 explored passages and attributes"];
const FIXTURE_SAVED = ["1 research notebook", "1 investigation", "1 Discovery Card", "1 Map connection", "2 explored passages and attributes"];

/** Opens Settings and waits until the app has opened (and upgraded) its database. */
async function openSettings(page: Page) {
  await page.goto("/settings");
  await expect(savedData(page)).toHaveCount(5);
}

/** Writes records straight into one of the app's IndexedDB stores, exactly as given. */
function putRaw(page: Page, store: string, records: readonly unknown[]) {
  return page.evaluate(
    ([name, values]) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("gospel-labs");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(name, "readwrite");
          for (const value of values) transaction.objectStore(name).put(value);
          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };
      }),
    [store, records] as const,
  );
}

/** Reads a store's records directly, without the app's validation. */
function getAllRaw(page: Page, store: string) {
  return page.evaluate(
    (name) =>
      new Promise<unknown[]>((resolve, reject) => {
        const request = indexedDB.open("gospel-labs");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const getAll = db.transaction(name).objectStore(name).getAll();
          getAll.onsuccess = () => {
            db.close();
            resolve(getAll.result);
          };
          getAll.onerror = () => reject(getAll.error);
        };
      }),
    store,
  );
}

/** The 2.0 fixture, with a field a newer version might add on the card. */
const seededStudy = () => ({
  ...structuredClone(STUDY_FROM_2_0),
  discoveries: [{ ...structuredClone(CARD_FROM_2_0), futureField: { addedLater: true } }],
});

async function seed(page: Page) {
  await putRaw(page, "investigations", [RECORD_FROM_1_1]);
  const study = seededStudy();
  for (const kind of KINDS) await putRaw(page, STORES[kind], study[kind]);
  const { theme, ...preferences } = PREFERENCES_FROM_2_0;
  await page.evaluate(
    ([storedTheme, stored]) => {
      localStorage.setItem("gospel-labs:theme", storedTheme);
      localStorage.setItem("gospel-labs:preferences", JSON.stringify(stored));
    },
    [theme, preferences] as const,
  );
  await page.reload();
  await expect(savedData(page)).toHaveText(FIXTURE_SAVED);
}

async function exportBackup(page: Page, path: string) {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export backup" }).click(),
  ]);
  await download.saveAs(path);
  return JSON.parse(readFileSync(path, "utf8"));
}

async function deleteEverything(page: Page) {
  await page.getByRole("button", { name: "Delete all data" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete all data?" });
  const list = dialog.getByRole("list", { name: "Will be deleted" });
  for (const text of ["1 research notebook", "1 investigation", "1 Discovery Card", "1 Map connection", "2 explored passages and attributes"]) {
    await expect(list).toContainText(text);
  }
  await expect(dialog).toContainText("Your appearance and study preferences are kept.");
  await dialog.getByRole("checkbox", { name: /I understand/ }).check();
  await dialog.getByRole("button", { name: "Delete everything" }).click();
  await expect(savedData(page)).toHaveText(NOTHING_SAVED);
}

const byId = (list: readonly { id: string }[]) => [...list].sort((a, b) => a.id.localeCompare(b.id));
const studyById = (study: Record<Kind, readonly { id: string }[]>) =>
  Object.fromEntries(KINDS.map((kind) => [kind, byId(study[kind])]));

test("study data and preferences survive export, delete everything, and import exactly", async ({ page }, testInfo) => {
  await openSettings(page);
  await seed(page);

  const firstPath = testInfo.outputPath("first.json");
  const first = await exportBackup(page, firstPath);
  expect(first).toMatchObject({ format: "gospel-labs-backup", version: 3, preferences: PREFERENCES_FROM_2_0 });
  expect(first.investigations).toEqual([RECORD_FROM_1_1]);
  // Every record exactly as stored, including the field this version doesn't know.
  expect(studyById(first.study)).toEqual(studyById(seededStudy()));
  await expect(page.getByText(/^Downloaded a backup of 1 research notebook, 1 investigation/)).toBeVisible();

  await deleteEverything(page);
  for (const kind of KINDS) expect(await getAllRaw(page, STORES[kind])).toEqual([]);
  // Preferences were kept. Change the theme so restoring it can be seen.
  expect(await page.evaluate(() => localStorage.getItem("gospel-labs:theme"))).toBe("dawn");
  await page.evaluate(() => localStorage.setItem("gospel-labs:theme", "light"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.locator('input[type="file"]').setInputFiles(firstPath);
  const dialog = page.getByRole("dialog", { name: "Import backup" });
  await expect(dialog).toContainText("Discovery Cards: 1 new · 0 updated · 0 unchanged");
  await expect(dialog).toContainText("Explored passages and attributes: 2 new · 0 updated · 0 unchanged");
  const restorePreferences = dialog.getByRole("checkbox", { name: /Also restore appearance and study preferences/ });
  await expect(restorePreferences).not.toBeChecked(); // off by default when merging
  await expect(dialog).toContainText("Theme: Parchment");
  await restorePreferences.check();
  await dialog.getByRole("button", { name: "Import", exact: true }).click();
  await expect(
    page.getByText("Imported: 6 new, 0 updated, 0 unchanged. Appearance and study preferences restored."),
  ).toBeVisible();
  await expect(savedData(page)).toHaveText(FIXTURE_SAVED);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dawn");
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem("gospel-labs:preferences"))) ?? "{}")).toMatchObject({
    motion: PREFERENCES_FROM_2_0.motion,
    studyLength: PREFERENCES_FROM_2_0.studyLength,
    difficulty: PREFERENCES_FROM_2_0.difficulty,
    activity: PREFERENCES_FROM_2_0.activity,
  });

  // Exporting again gives the same data.
  const second = await exportBackup(page, testInfo.outputPath("second.json"));
  expect(byId(second.investigations)).toEqual(byId(first.investigations));
  expect(studyById(second.study)).toEqual(studyById(first.study));
  expect(second.preferences).toEqual(first.preferences);

  // Importing it again with merge changes nothing.
  await page.locator('input[type="file"]').setInputFiles(firstPath);
  await expect(dialog).toContainText("Discovery Cards: 0 new · 0 updated · 1 unchanged");
  await dialog.getByRole("button", { name: "Import", exact: true }).click();
  await expect(page.getByText("Imported: 0 new, 0 updated, 6 unchanged.")).toBeVisible();
});

test("replacing with a 1.1 backup lists the study data it will delete first", async ({ page }, testInfo) => {
  await openSettings(page);
  await seed(page);

  const path = testInfo.outputPath("from-1.1.json");
  writeFileSync(path, BACKUP_FROM_1_1);
  await page.locator('input[type="file"]').setInputFiles(path);
  const dialog = page.getByRole("dialog", { name: "Import backup" });
  await expect(dialog).toContainText("made by Gospel Labs 1.x, which saved only research notebooks");
  // A 1.x backup has no preferences to offer.
  await expect(dialog.getByRole("checkbox", { name: /Also restore/ })).toHaveCount(0);

  await dialog.getByText("Replace all my data").click();
  await expect(dialog).toContainText("Discovery Cards: 1 deleted · 0 restored");
  await expect(dialog).toContainText(
    "Everything now on this device will be permanently deleted: 1 research notebook, 1 investigation, 1 Discovery Card, 1 Map connection, and 2 explored passages and attributes.",
  );
  await expect(dialog.getByRole("button", { name: "Replace all data" })).toBeDisabled();
  await dialog.getByRole("checkbox", { name: /I understand/ }).check();
  await dialog.getByRole("button", { name: "Replace all data" }).click();
  await expect(page.getByText("Replaced your data with 1 research notebook from the backup.")).toBeVisible();
  await expect(savedData(page)).toHaveText(["1 research notebook", ...NOTHING_SAVED.slice(1)]);
  for (const kind of KINDS) expect(await getAllRaw(page, STORES[kind])).toEqual([]);
});

test("a 2.0 backup restores into a new device with Replace, explaining what it skips", async ({ page }, testInfo) => {
  await openSettings(page);
  const backup = JSON.parse(BACKUP_FROM_2_0);
  backup.study.discoveries.push({ ...CARD_FROM_2_0, id: "broken-card", title: "" });
  backup.preferences.motion = "wild";
  const path = testInfo.outputPath("from-2.0.json");
  writeFileSync(path, JSON.stringify(backup));

  await page.locator('input[type="file"]').setInputFiles(path);
  const dialog = page.getByRole("dialog", { name: "Import backup" });
  await expect(dialog).toContainText("1 entry in this file is damaged, duplicated, or from a newer version and will be skipped.");
  await dialog.getByText("Show details").click();
  await expect(dialog).toContainText("Discovery Card #2 broken-card");
  await expect(dialog).toContainText("Some preferences in the file aren't valid and won't be restored: motion.");

  await dialog.getByText("Replace all my data").click();
  // Nothing on this device yet, so there's nothing to acknowledge; preferences are restored by default.
  await expect(dialog.getByRole("checkbox", { name: /I understand/ })).toHaveCount(0);
  await expect(dialog.getByRole("checkbox", { name: /Also restore appearance and study preferences/ })).toBeChecked();
  await dialog.getByRole("button", { name: "Replace all data" }).click();
  await expect(
    page.getByText(
      "Replaced your data with 1 research notebook, 1 investigation, 1 Discovery Card, 1 Map connection, and 2 explored passages and attributes from the backup. Appearance and study preferences restored.",
    ),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dawn");
  expect(byId((await getAllRaw(page, "discoveries")) as { id: string }[])).toEqual([CARD_FROM_2_0]);
});
