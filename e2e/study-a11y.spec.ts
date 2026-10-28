/**
 * Accessibility: an axe audit (WCAG 2.0/2.1/2.2 A and AA rules) of every
 * main page in all four themes, plus the states in between pages — an
 * investigation step with feedback and a hint showing, a finished step, the
 * completion view, the Map with a node open, and open dialogs and sheets.
 * Zero violations allowed. Then keyboard checks: the skip link, the
 * navigation (including the More sheet on phones), and visible focus.
 *
 * axe is loaded with addInitScript, which the page's Content-Security-Policy
 * doesn't apply to (it allows same-origin scripts only), so the audit runs
 * against the real production headers.
 */
import { join } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import type { CheckedActivity } from "@/domain/study/content-schema";
import { CARD_FROM_2_0, CONNECTION_FROM_2_0 } from "../src/persistence/legacy-fixtures";
import { activityAt, activitySection, answer, checkButton, investigation, pathSteps, solveStep, startInvestigation, stepArticle, wrongResponse } from "./study-helpers";

/** axe-core is installed as a dependency of the toolchain; tests run from the repository root. */
const AXE_PATH = join(process.cwd(), "node_modules", "axe-core", "axe.min.js");
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const THEMES = [
  { name: "Lab", value: "dark" },
  { name: "Daylight", value: "light" },
  { name: "Parchment", value: "dawn" },
  { name: "Evening", value: "evening" },
] as const;

const PAGES = [
  "/",
  "/investigate",
  "/investigate/one-by-one",
  "/explore",
  "/explore/he-will-take-upon-him",
  "/character",
  "/character/meekness",
  "/connect",
  "/notebook",
  `/notebook?card=${CARD_FROM_2_0.id}`,
  "/map",
  `/map?node=${encodeURIComponent("concept:atonement")}`,
  "/notebook?view=journal",
  "/settings",
  "/settings/appearance",
  "/settings/study",
  "/settings/data",
  "/settings/privacy",
  "/settings/feedback",
  "/settings/about",
  "/library",
  "/questions",
];

declare global {
  interface Window {
    axe: { run: (context: Element | Document, options: object) => Promise<{ violations: AxeViolation[] }> };
  }
}
interface AxeViolation {
  id: string;
  impact: string | null;
  help: string;
  nodes: { target: string[]; failureSummary?: string }[];
}

/** Runs axe on the page (or one element) and fails with a readable list of violations. */
async function expectNoViolations(page: Page, where: string, include?: Locator) {
  // Let entrance motion and late layout settle (motion is off in these tests, so this is brief).
  await page.waitForTimeout(100);
  const handle = include ? await include.elementHandle() : null;
  const violations = await page.evaluate(
    async ([element, tags]) => {
      const result = await window.axe.run(element ?? document, { runOnly: { type: "tag", values: tags }, resultTypes: ["violations"] });
      return result.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 5).map((n) => ({ target: n.target, failureSummary: n.failureSummary })) }));
    },
    [handle, WCAG_TAGS] as const,
  );
  const report = violations
    .map((v) => `${v.id} (${v.impact}): ${v.help}\n${v.nodes.map((n) => `    ${n.target.join(" ")} — ${n.failureSummary?.split("\n").slice(1, 2).join(" ").trim()}`).join("\n")}`)
    .join("\n");
  expect(violations, `Accessibility violations on ${where}:\n${report}`).toEqual([]);
}

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

async function prepare(page: Page, theme: string) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript({ path: AXE_PATH });
  await page.addInitScript((value) => localStorage.setItem("gospel-labs:theme", value), theme);
  await page.goto("/settings/data");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // Backup and data opens the database, so the records below land in the app's own stores.
  await putRaw(page, "discoveries", [CARD_FROM_2_0]);
  await putRaw(page, "personalConnections", [CONNECTION_FROM_2_0]);
}

for (const theme of THEMES) {
  test(`every main page has no WCAG A/AA violations in the ${theme.name} theme`, async ({ page }) => {
    test.setTimeout(180_000);
    await prepare(page, theme.value);
    for (const path of PAGES) {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme.value);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      await expectNoViolations(page, `${path} (${theme.name})`);
    }
    // The Map as a list, and a Connect session read to the end.
    await page.goto("/map");
    await page.getByRole("radio", { name: "List view" }).locator("xpath=ancestor::label[1]").click();
    await expectNoViolations(page, `/map List view (${theme.name})`);
    await page.goto("/connect");
    // Today's session varies by date, and so does how many sections it has: continue until its pause is offered.
    const pause = page.getByRole("button", { name: "Take a moment" });
    for (let i = 0; i < 4 && !(await pause.isVisible()); i++) await page.getByRole("button", { name: "Continue", exact: true }).click();
    await pause.click();
    await expectNoViolations(page, `/connect at the end of a session (${theme.name})`);
  });

  test(`an investigation, from feedback and hints to the discovery, has no violations in the ${theme.name} theme`, async ({ page }) => {
    test.setTimeout(180_000);
    await prepare(page, theme.value);
    const inv = investigation("when-faithful-people-suffer");
    const steps = pathSteps(inv, "deep");
    await startInvestigation(page, inv.id, { difficulty: "medium", length: "deep" });

    // A wrong answer with its feedback, and a hint.
    const activity = activityAt(steps[0], "medium") as CheckedActivity;
    const section = activitySection(stepArticle(page, steps[0]), activity);
    await answer(page, section, activity, wrongResponse(activity));
    await checkButton(section).click();
    await section.getByRole("button", { name: "Need a hint?" }).click();
    await expectNoViolations(page, `a step with feedback and a hint (${theme.name})`);

    // The study settings dialog.
    await page.getByRole("button", { name: /change difficulty or session length/ }).click();
    await expectNoViolations(page, `the study settings dialog (${theme.name})`, page.getByRole("dialog", { name: "Study settings" }));
    await page.getByRole("dialog", { name: "Study settings" }).getByRole("button", { name: "Done" }).click();

    // A finished step with its insight and a side question on offer; then inside the side question.
    await answer(page, section, activity);
    await checkButton(section).click();
    await expectNoViolations(page, `a finished step with a side question offered (${theme.name})`);
    await page.getByRole("complementary", { name: "A related question" }).getByRole("button", { name: "Explore" }).click();
    await expectNoViolations(page, `inside a side question (${theme.name})`);
    await page.getByRole("region", { name: "Side question" }).getByRole("button", { name: "Return to the investigation" }).click();

    // Each remaining activity type on the way, then the completion view.
    await page.getByRole("button", { name: "Next step" }).click();
    for (const [index, step] of steps.slice(1).entries()) {
      await expect(stepArticle(page, step)).toBeVisible();
      await expectNoViolations(page, `step ${index + 2}, ${activityAt(step, "medium").type} (${theme.name})`);
      await solveStep(page, step, "medium", { next: index < steps.length - 2 });
    }
    await page.getByRole("button", { name: "See your discovery" }).click();
    await expect(page.getByText("Saved to your Notebook.")).toBeVisible();
    await expectNoViolations(page, `the completion view (${theme.name})`);

    // The Map with this discovery's node open, and the connection dialog.
    await page.goto(`/map?node=${encodeURIComponent(`investigation:${inv.id}`)}`);
    await expect(page.getByRole("complementary", { name: inv.title })).toBeVisible();
    await expectNoViolations(page, `the Map with a node open (${theme.name})`);
    // From the node's details (on phones they cover the toolbar, as a bottom sheet).
    await page.getByRole("complementary", { name: inv.title }).getByRole("button", { name: "Connect" }).click();
    await page.getByRole("dialog", { name: "Connect two things on your Map" }).getByRole("button", { name: "Add connection" }).click();
    await expectNoViolations(page, `the connection dialog with errors (${theme.name})`, page.getByRole("dialog", { name: "Connect two things on your Map" }));
  });
}

test("dialogs from Settings have no violations", async ({ page }) => {
  await prepare(page, "dark");
  await page.goto("/settings/data");
  await page.getByRole("button", { name: "Delete all data" }).click();
  await expectNoViolations(page, "the delete-all dialog", page.getByRole("dialog", { name: "Delete all data?" }));
});

test("the skip link moves focus to the main content", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
  // The next Tab lands inside the main content, not back in the navigation.
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => !!document.activeElement?.closest("main"))).toBe(true);
});

test("the navigation works from the keyboard, including the More sheet on phones", async ({ page, isMobile }) => {
  await page.goto("/");
  const primary = page.getByRole("navigation", { name: "Primary" });
  if (!isMobile) {
    // Tab through the sidebar to Notebook, then follow it.
    const notebook = primary.getByRole("link", { name: "Notebook" });
    for (let i = 0; i < 20 && !(await notebook.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab");
    await expect(notebook).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL("/notebook");
    await expect(primary.getByRole("link", { name: "Notebook" })).toHaveAttribute("aria-current", "page");
    return;
  }
  // Phones: a bottom tab bar, with the rest of the sections under More.
  const more = primary.getByRole("button", { name: "More" });
  for (let i = 0; i < 80 && !(await more.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab");
  await expect(more).toBeFocused();
  await page.keyboard.press("Enter");
  const sheet = page.getByRole("dialog", { name: "More" });
  await expect(sheet).toBeVisible();
  await expect(more).toHaveAttribute("aria-expanded", "true");
  // Escape closes it and focus returns to More.
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(more).toBeFocused();
  // Open it again and follow a link from the keyboard.
  await page.keyboard.press("Enter");
  const settings = sheet.getByRole("link", { name: "Settings" });
  for (let i = 0; i < 20 && !(await settings.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab");
  await expect(settings).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/settings");
  await expect(more).toHaveAttribute("aria-current", "page");
});

/** The focused element (or, for a visually hidden input, its label) shows a focus outline or ring. */
async function expectVisibleFocus(page: Page, what: string) {
  const focusState = () =>
    page.evaluate(() => {
      const focused = document.activeElement as HTMLElement | null;
      if (!focused || focused === document.body) return "nothing focused";
      if (!focused.matches(":focus-visible")) return `${focused.tagName} isn't :focus-visible`;
      const visible = (element: Element) => {
        const s = getComputedStyle(element);
        return (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 1.5) || s.boxShadow !== "none";
      };
      const label = focused.closest("label");
      return visible(focused) || (!!label && visible(label)) ? "visible" : `${focused.tagName} has no visible focus indicator`;
    });
  // Polled: with motion off, styles still change through a near-instant transition that lands on the next frame.
  await expect.poll(focusState, { message: `Focus on ${what}` }).toBe("visible");
}

test("keyboard focus is always visible on study controls", async ({ page }) => {
  await page.goto("/investigate/one-by-one");
  // A difficulty card (a visually hidden radio inside its label). Tab enters the group at the chosen one (Easy, for a new learner).
  const easy = page.getByRole("radio", { name: /^Easy/ });
  for (let i = 0; i < 60 && !(await easy.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab");
  await expect(easy).toBeFocused();
  await expectVisibleFocus(page, "a difficulty choice");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: /^Medium/ })).toBeFocused();
  await expect(page.getByRole("radio", { name: /^Medium/ })).toBeChecked();
  await expectVisibleFocus(page, "the next difficulty choice");
  const begin = page.getByRole("button", { name: "Begin the investigation" });
  for (let i = 0; i < 20 && !(await begin.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab");
  await expectVisibleFocus(page, "the Begin button");
  await page.keyboard.press("Enter");
  // A control inside the first activity (a matching board).
  const inv = investigation("one-by-one");
  const step = pathSteps(inv, "quick")[0];
  const section = activitySection(stepArticle(page, step), activityAt(step, "medium"));
  await expect(section).toBeVisible();
  const inActivity = () => section.evaluate((el) => el.contains(document.activeElement) && document.activeElement?.tagName === "BUTTON");
  for (let i = 0; i < 80 && !(await inActivity()); i++) await page.keyboard.press("Tab");
  await expectVisibleFocus(page, "a control in the activity");
  // A word in Scripture Explorer.
  await page.goto("/explore/he-will-take-upon-him");
  const words = page.getByRole("group", { name: /words you can highlight/ }).getByRole("button");
  await expect(words.first()).toBeEnabled();
  for (let i = 0; i < 60 && !(await words.first().evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab");
  await expectVisibleFocus(page, "a word in the passage");
  await page.keyboard.press("ArrowRight");
  await expectVisibleFocus(page, "the next word in the passage");
});

test("the Map works from the keyboard: Tab in, arrows between items, Enter for details, Escape to close", async ({ page }) => {
  await prepare(page, "dark");
  await page.goto("/map");
  const map = page.getByRole("group", { name: "Discovery Map" });
  const nodes = map.getByRole("button");
  await expect(nodes.first()).toBeVisible();
  const focusedNode = () => page.evaluate(() => document.activeElement?.getAttribute("data-node") ?? null);

  // The map is one tab stop.
  for (let i = 0; i < 80 && !(await focusedNode()); i++) await page.keyboard.press("Tab");
  const start = await focusedNode();
  expect(start).not.toBeNull();
  // A focused node draws an accent ring around itself (an SVG circle shown on :focus-visible) instead of an outline.
  const ringShown = () =>
    page.evaluate(() =>
      [...(document.activeElement?.querySelectorAll("circle") ?? [])].some(
        (circle) => (circle.getAttribute("class") ?? "").includes("group-focus-visible:opacity-100") && getComputedStyle(circle).opacity === "1",
      ),
    );
  expect(await page.evaluate(() => document.activeElement?.matches(":focus-visible"))).toBe(true);
  await expect.poll(ringShown, { message: "A focused Map node shows its focus ring" }).toBe(true);
  // Arrow keys move to another item; Home and End reach the ends.
  await page.keyboard.press("End");
  const end = await focusedNode();
  await page.keyboard.press("Home");
  const home = await focusedNode();
  expect(new Set([start, end, home]).size).toBeGreaterThan(1);
  let moved = false;
  for (const key of ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"]) {
    await page.keyboard.press(key);
    if ((await focusedNode()) !== home) {
      moved = true;
      break;
    }
  }
  expect(moved, "An arrow key moves focus to another item").toBe(true);

  // Enter opens the item's details; Escape closes them and focus returns to the item.
  const ref = (await focusedNode())!;
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(`/map?node=${encodeURIComponent(ref)}`);
  const details = page.getByRole("complementary").filter({ has: page.getByRole("button", { name: "Close details" }) });
  await expect(details).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(details).toHaveCount(0);
  await expect(page).toHaveURL("/map");
  await expect.poll(focusedNode).toBe(ref);
});
