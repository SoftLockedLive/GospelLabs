/**
 * Updating from Gospel Labs 1.1: a database created by 1.1 (schema version 1,
 * with only the research `investigations` table) opens in 2.0 with its
 * investigation intact and untouched, and the new study tables work at once.
 * The 1.1 database is created directly with the IndexedDB API, as 1.1's
 * Dexie schema did, before any 2.0 page has opened it.
 */
import { expect, test, type Page } from "@playwright/test";
import type { StudyProgress } from "@/domain/study/user-data";
import { RECORD_FROM_1_1 } from "../src/persistence/legacy-fixtures";
import { getRawRecord, libraryItem } from "./helpers";
import { investigation, pathSteps, readStore, solveStep, startInvestigation, stepArticle } from "./study-helpers";

/** Dexie stores version n as IndexedDB version n × 10: 1.1's schema version 1 is 10. */
const VERSION_1_1 = 10;

function createDatabaseAs1_1(page: Page) {
  return page.evaluate(
    ([version, record]) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("gospel-labs", version);
        request.onupgradeneeded = () => {
          // Exactly 1.1's schema: investigations: "id, updatedAt, status".
          const store = request.result.createObjectStore("investigations", { keyPath: "id" });
          store.createIndex("updatedAt", "updatedAt");
          store.createIndex("status", "status");
        };
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction("investigations", "readwrite");
          transaction.objectStore("investigations").put(record);
          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };
      }),
    [VERSION_1_1, RECORD_FROM_1_1] as const,
  );
}

function describeDatabase(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ version: number; stores: string[] }>((resolve, reject) => {
        const request = indexedDB.open("gospel-labs");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const result = { version: db.version, stores: [...db.objectStoreNames].sort() };
          db.close();
          resolve(result);
        };
      }),
  );
}

test("a database created by 1.1 opens in 2.0 with its investigation intact, and the study tables work", async ({ page }) => {
  // A same-origin page that doesn't open the database, so 1.1's schema is created first.
  await page.goto("/manifest.webmanifest");
  await createDatabaseAs1_1(page);
  expect(await describeDatabase(page)).toEqual({ version: VERSION_1_1, stores: ["investigations"] });

  // 2.0 opens it: the research notebook is there, exactly as 1.1 saved it.
  await page.goto("/library");
  await expect(libraryItem(page, RECORD_FROM_1_1.title)).toBeVisible();
  const upgraded = await describeDatabase(page);
  expect(upgraded.version).toBeGreaterThan(VERSION_1_1);
  expect(upgraded.stores).toEqual(["discoveries", "explorations", "investigations", "journal", "personalConnections", "studyProgress"]);
  expect(await getRawRecord(page, RECORD_FROM_1_1.id)).toEqual(RECORD_FROM_1_1);
  await page.goto("/settings/data");
  await expect(page.getByRole("list", { name: "Saved on this device" }).getByRole("listitem").first()).toHaveText("1 research notebook");

  // The new tables are usable right away, and progress survives a reload.
  const inv = investigation("christ-at-the-center");
  await startInvestigation(page, inv.id, { difficulty: "easy", length: "quick" });
  await solveStep(page, pathSteps(inv, "quick")[0], "easy");
  await expect(stepArticle(page, pathSteps(inv, "quick")[1])).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /^Resume · step 2/ }).click();
  await expect(stepArticle(page, pathSteps(inv, "quick")[1])).toBeVisible();
  const [progress] = await readStore<StudyProgress>(page, "studyProgress");
  expect(progress).toMatchObject({ id: inv.id, difficulty: "easy", length: "quick" });

  // The research notebook still opens and its record is still untouched.
  await page.goto("/library");
  await libraryItem(page, RECORD_FROM_1_1.title).getByRole("link", { name: /^Resume/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: RECORD_FROM_1_1.title })).toBeVisible();
  expect(await getRawRecord(page, RECORD_FROM_1_1.id)).toEqual(RECORD_FROM_1_1);
});
