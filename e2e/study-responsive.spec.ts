/**
 * Every main page fits the screen at 320px (small phones), 768px (tablets),
 * and 1280px (laptops): nothing makes the page scroll sideways. Pages that
 * show personal data are checked with a Discovery Card, a Map connection, and
 * 1.x research notebooks with long, hard-to-break titles on the device, and an
 * investigation is checked on a step with an activity open.
 */
import { expect, test, type Page } from "@playwright/test";
import { CARD_FROM_2_0, CONNECTION_FROM_2_0, RECORD_FROM_1_1 } from "../src/persistence/legacy-fixtures";
import { activityAt, investigation, pathSteps, startInvestigation, stepArticle } from "./study-helpers";

const WIDTHS = [320, 768, 1280] as const;

/**
 * A 1.x research notebook as people really left them: no title (so its long
 * question names it), and a saved discovery with a pasted link in it. The
 * Notebook lists these under "From your research notebooks".
 */
const LONG_RESEARCH_NOTEBOOK = {
  ...RECORD_FROM_1_1,
  id: "long-research-notebook",
  title: "",
  question: "How can I recognize when Heavenly Father is answering my prayers, especially when the answer isn’t what I expected?",
  discoveryHighlights: [
    {
      ...RECORD_FROM_1_1.discoveryHighlights[0],
      id: "hl-long",
      title: "Answers often come quietly, over time, and through other people as well as feelings",
      insight: "From https://www.churchofjesuschrist.org/study/general-conference/2024/04/how-to-recognize-answers-to-prayer?lang=eng",
    },
  ],
};

/** Another, titled with a pasted link and a long one-word category: nothing to break a line at. */
const LINK_TITLED_NOTEBOOK = {
  ...RECORD_FROM_1_1,
  id: "link-titled-notebook",
  title: "https://www.churchofjesuschrist.org/study/general-conference/2024/04/how-to-recognize-answers-to-prayer?lang=eng&id=p12#p12",
  category: "Discipleshipandconsecrationandcovenants",
};

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
  "/investigations/view?id=link-titled-notebook",
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

/**
 * The page doesn't scroll sideways, and nothing in it is wider than the screen. The main area clips
 * overflow (so a mistake can't push the tab bar off screen), which hides it from the page's scroll
 * width, so elements sticking out are looked for directly; those inside their own scrolling or
 * clipping container (a scrolling step path, say) are fine. On failure, names them.
 */
async function expectNoHorizontalOverflow(page: Page, where: string) {
  // Let late layout (fonts, measured lines) settle.
  await page.waitForTimeout(150);
  const result = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const overflow = document.documentElement.scrollWidth - width;
    const main = document.getElementById("main");
    const contained = (element: Element) => {
      for (let parent = element.parentElement; parent && parent !== main; parent = parent.parentElement) {
        if (getComputedStyle(parent).overflowX !== "visible") return true;
      }
      return false;
    };
    const culprits = [...document.querySelectorAll<HTMLElement>("body *")]
      .filter((element) => {
        const box = element.getBoundingClientRect();
        return box.right > width + 1 && box.width > 1 && box.height > 1 && element.getClientRects().length > 0 && !contained(element);
      })
      .slice(0, 8)
      .map((element) => `${element.tagName.toLowerCase()}.${String(element.className).slice(0, 60)} (${Math.round(element.getBoundingClientRect().right)}px)`);
    return { overflow, culprits };
  });
  expect(result.overflow, `${where} scrolls sideways by ${result.overflow}px`).toBeLessThanOrEqual(0);
  expect(result.culprits, `${where} has elements wider than the screen`).toEqual([]);
}

for (const width of WIDTHS) {
  test(`every main page fits a ${width}px-wide screen`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/settings");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await putRaw(page, "discoveries", [CARD_FROM_2_0]);
    await putRaw(page, "personalConnections", [CONNECTION_FROM_2_0]);
    await putRaw(page, "investigations", [LONG_RESEARCH_NOTEBOOK, LINK_TITLED_NOTEBOOK]);

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
