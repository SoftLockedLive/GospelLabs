/**
 * Appearance, motion, and study preferences. Each theme sets <html
 * data-theme> and survives a reload; "System" follows the device; motion
 * "Off" (or "Follow my device" when the device asks for reduced motion)
 * turns animation off; and the activity options change what investigations offer.
 */
import { expect, test, type Page } from "@playwright/test";
import { activityAt, investigation, pathSteps, pick, solveStep, startInvestigation, stepArticle } from "./study-helpers";

const html = (page: Page) => page.locator("html");
const themeChoice = (page: Page, label: string) => page.getByRole("group", { name: "Theme" }).getByRole("radio", { name: new RegExp(`^${label}\\b`) });
const motionChoice = (page: Page, label: string) => page.getByRole("group", { name: "Motion" }).getByRole("radio", { name: new RegExp(`^${label}\\b`) });

const THEMES = [
  { label: "Daylight", theme: "light" },
  { label: "Parchment", theme: "dawn" },
  { label: "Evening", theme: "evening" },
  { label: "Lab", theme: "dark" },
] as const;

test("each theme sets the page's theme at once and is kept after a reload", async ({ page }) => {
  await page.goto("/settings");
  await expect(html(page)).toHaveAttribute("data-theme", "dark");
  await expect(themeChoice(page, "Lab")).toBeChecked();
  for (const { label, theme } of THEMES) {
    await pick(themeChoice(page, label));
    await expect(html(page)).toHaveAttribute("data-theme", theme);
    await page.reload();
    await expect(html(page)).toHaveAttribute("data-theme", theme);
    await expect(themeChoice(page, label)).toBeChecked();
    // Other pages open in the same theme, before anything else runs (no flash).
    await page.goto("/notebook");
    await expect(html(page)).toHaveAttribute("data-theme", theme);
    await page.goto("/settings");
  }
});

test("System follows the device's light or dark setting, including changes while open", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/settings");
  await pick(themeChoice(page, "System"));
  await expect(html(page)).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(html(page)).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(html(page)).toHaveAttribute("data-theme", "dark");
  await expect(themeChoice(page, "System")).toBeChecked();
  await page.emulateMedia({ colorScheme: "light" });
  await expect(html(page)).toHaveAttribute("data-theme", "light");
});

test("motion Off turns animation off; Follow my device does too when the device asks for reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/settings");
  await expect(motionChoice(page, "Follow my device")).toBeChecked();
  await expect(html(page)).toHaveAttribute("data-motion", "subtle");

  await pick(motionChoice(page, "Off"));
  await expect(html(page)).toHaveAttribute("data-motion", "off");
  await page.reload();
  await expect(html(page)).toHaveAttribute("data-motion", "off");
  await pick(motionChoice(page, "Full"));
  await expect(html(page)).toHaveAttribute("data-motion", "full");

  // Back to following the device, which asks for reduced motion: off, including after a reload.
  await pick(motionChoice(page, "Follow my device"));
  await expect(html(page)).toHaveAttribute("data-motion", "subtle");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(html(page)).toHaveAttribute("data-motion", "off");
  await page.reload();
  await expect(html(page)).toHaveAttribute("data-motion", "off");
  // An explicit choice wins over the device.
  await pick(motionChoice(page, "Subtle"));
  await expect(html(page)).toHaveAttribute("data-motion", "subtle");
});

/** Elements whose CSS animations or transitions take any noticeable time. */
const animatedElements = (page: Page) =>
  page.evaluate(() => {
    const seconds = (value: string) => Math.max(...value.split(",").map((part) => (part.trim().endsWith("ms") ? parseFloat(part) / 1000 : parseFloat(part)) || 0));
    return [...document.querySelectorAll<HTMLElement>("body *")]
      .filter((element) => {
        const style = getComputedStyle(element);
        return (style.animationName !== "none" && seconds(style.animationDuration) > 0.001) || seconds(style.transitionDuration) > 0.001;
      })
      .map((element) => `${element.tagName.toLowerCase()}.${String(element.className).slice(0, 80)}`);
  });

test("with motion Off, nothing animates even when the device doesn't ask for reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/settings");
  // With motion on, the interface does animate (so the check below can tell the difference).
  await pick(motionChoice(page, "Full"));
  expect((await animatedElements(page)).length).toBeGreaterThan(0);

  await pick(motionChoice(page, "Off"));
  for (const path of ["/settings", "/", "/character/meekness", "/investigate/one-by-one"]) {
    await page.goto(path);
    await expect(html(page)).toHaveAttribute("data-motion", "off");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await animatedElements(page), `Animated on ${path}`).toEqual([]);
  }
});

test("study activity options: side questions and reflection prompts can be turned off", async ({ page }) => {
  await page.goto("/settings");
  const options = page.getByRole("group", { name: "During activities" });
  await options.getByRole("switch", { name: /^Offer side questions/ }).click();
  await options.getByRole("switch", { name: /^Show reflection prompts/ }).click();
  await expect(options.getByRole("switch", { name: /^Offer side questions/ })).not.toBeChecked();
  await expect(options.getByRole("switch", { name: /^Show reflection prompts/ })).not.toBeChecked();

  // A deep session offers no side questions now.
  const inv = investigation("when-faithful-people-suffer");
  const steps = pathSteps(inv, "deep");
  await startInvestigation(page, inv.id, { difficulty: "medium", length: "deep" });
  await solveStep(page, steps[0], "medium", { next: false });
  await expect(page.getByRole("complementary", { name: "A related question" })).toHaveCount(0);

  // The closing reflection is offered to ponder, without a writing box.
  const short = investigation("again-and-again");
  const quick = pathSteps(short, "quick");
  await startInvestigation(page, short.id, { difficulty: "easy", length: "quick" });
  for (const step of quick.slice(0, -1)) await solveStep(page, step, "easy");
  const last = quick.at(-1)!;
  expect(activityAt(last, "easy").type).toBe("reflect");
  const article = stepArticle(page, last);
  await expect(article.getByText("Take a quiet moment with this question. Writing prompts are turned off in Settings.")).toBeVisible();
  await expect(article.getByRole("textbox")).toHaveCount(0);
  await article.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(article.getByRole("button", { name: "See your discovery" })).toBeEnabled();
});
