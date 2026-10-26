/**
 * Every main page fits the screen at 320px (small phones), 768px (tablets),
 * and 1280px (laptops): nothing makes the page scroll sideways. Pages that
 * show personal data are checked with a Discovery Card and a Map connection
 * on the device, and an investigation is checked on a step with an activity open.
 */
import { expect, test, type Page } from "@playwright/test";
import { CARD_FROM_2_0, CONNECTION_FROM_2_0 } from "../src/persistence/legacy-fixtures";
import { activityAt, investigation, pathSteps, startInvestigation, stepArticle } from "./study-helpers";

const WIDTHS = [320, 768, 1280] as const;

const PAGES = [
  "/",
  "/investigate",
  "/explore",
  "/explore/he-will-take-upon-him",
  "/character",
  "/character/meekness",
  "/connect",
  "/notebook",
  `/notebook?card=${CARD_FROM_2_0.id}`,
  "/map",
  "/settings",
  "/library",
  "/questions",
];

/** Puts records straight into the app's IndexedDB stores. Open an app page first so the database exists. */
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

/** The page doesn't scroll sideways. On failure, names the elements that stick out. */
async function expectNoHorizontalOverflow(page: Page, where: string) {
  // Let late layout (fonts, measured lines) settle.
  await page.waitForTimeout(150);
  const result = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const overflow = document.documentElement.scrollWidth - width;
    const culprits =
      overflow > 0
        ? [...document.querySelectorAll<HTMLElement>("body *")]
            .filter((element) => element.getBoundingClientRect().right > width + 1 && element.getClientRects().length > 0)
            .slice(0, 8)
            .map((element) => `${element.tagName.toLowerCase()}.${String(element.className).slice(0, 60)} (${Math.round(element.getBoundingClientRect().right)}px)`)
        : [];
    return { overflow, culprits };
  });
  expect(result.overflow, `${where} scrolls sideways by ${result.overflow}px: ${result.culprits.join(" | ")}`).toBeLessThanOrEqual(0);
}

for (const width of WIDTHS) {
  test(`every main page fits a ${width}px-wide screen`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/settings");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await putRaw(page, "discoveries", [CARD_FROM_2_0]);
    await putRaw(page, "personalConnections", [CONNECTION_FROM_2_0]);

    for (const path of PAGES) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      await expectNoHorizontalOverflow(page, `${path} at ${width}px`);
    }
    // The Map's List view, too.
    await page.goto("/map");
    await page.getByRole("radio", { name: "List view" }).locator("xpath=ancestor::label[1]").click();
    await expect(page.getByRole("heading", { level: 3, name: CARD_FROM_2_0.concepts[0].label })).toBeVisible();
    await expectNoHorizontalOverflow(page, `/map (List view) at ${width}px`);

    // Investigation steps with an activity open: a matching board, and building a principle.
    for (const [id, difficulty] of [["one-by-one", "medium"], ["families-beyond-the-veil", "complex"]] as const) {
      const inv = investigation(id);
      await startInvestigation(page, inv.id, { difficulty, length: "quick" });
      const step = pathSteps(inv, "quick")[0];
      await expect(stepArticle(page, step).getByRole("region", { name: activityAt(step, difficulty).prompt })).toBeVisible();
      await expectNoHorizontalOverflow(page, `/investigate/${inv.id} step 1 (${difficulty}) at ${width}px`);
    }
  });
}
