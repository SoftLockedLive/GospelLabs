/**
 * Welcome and What's new (2.1). New learners get the welcome on the dashboard
 * (a tour, a theme choice, the version, and how to report a bug) and never
 * What's new. Returning learners get What's new for every release since the
 * one they last saw: recorded from 2.1 on, and before that inferred from what
 * is stored on the device. Patches are never announced (2.2.0.1). Most other
 * specs run as learners already on this version (see playwright.config.ts);
 * these start from an empty browser.
 */
import { join } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";
import rawChangelog from "@/content/changelog.json";
import { compareVersions, displayVersion, isContentOnly, type Release } from "@/domain/changelog";
import { BACKUP_FROM_2_0, RECORD_FROM_1_1 } from "../src/persistence/legacy-fixtures";
import { pick } from "./study-helpers";

test.use({ storageState: { cookies: [], origins: [] } });

const RELEASE = (JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as { version: string }).version;
const RELEASES = rawChangelog.releases as Release[];
/** What's new leaves patches out. */
const ANNOUNCED = RELEASES.filter((release) => release.kind !== "patch");
const LATEST = ANNOUNCED[0];
const LAST_SEEN = "gospel-labs:last-seen-version";
const WELCOME = "gospel-labs:welcome";
const AXE_PATH = join(process.cwd(), "node_modules", "axe-core", "axe.min.js");

const welcome = (page: Page) => page.getByRole("region", { name: "Welcome to Gospel Labs" });
const whatsNew = (page: Page) => page.getByRole("complementary", { name: /Gospel Labs has been updated/ });
const stored = (page: Page, key: string) => page.evaluate((k) => localStorage.getItem(k), key);
const since = (version: string) => ANNOUNCED.filter((release) => compareVersions(release.version, version) > 0);

/** Sets localStorage before the app runs, without overwriting what the app writes later. */
function seed(page: Page, entries: Record<string, string>) {
  return page.addInitScript((values) => {
    for (const [key, value] of Object.entries(values)) if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
  }, entries);
}

/** A 1.1 research notebook, created the way 1.1's Dexie schema did, before any 2.x page opens the database. */
async function createDatabaseAs1_1(page: Page) {
  await page.goto("/manifest.webmanifest");
  await page.evaluate(
    (record) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("gospel-labs", 10);
        request.onupgradeneeded = () => {
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
    RECORD_FROM_1_1,
  );
}

type Axe = { run: (context: Element | Document, options: object) => Promise<{ violations: { id: string; help: string }[] }> };

async function expectNoViolations(page: Page, where: string, include: Locator) {
  await page.waitForTimeout(100);
  const handle = await include.elementHandle();
  const violations = await page.evaluate(
    async (element) =>
      (await (window as unknown as { axe: Axe }).axe.run(element ?? document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] })).violations.map(
        (v) => `${v.id}: ${v.help}`,
      ),
    handle,
  );
  expect(violations, `Accessibility violations in ${where}`).toEqual([]);
}

test("a new learner gets the welcome, a tour, a theme choice, the version, and how to report a bug, but not What's new", async ({ page }) => {
  await page.goto("/");
  await expect(welcome(page)).toBeVisible();
  await expect(whatsNew(page)).toHaveCount(0);
  // From now on this device counts as current, so later releases are announced to it.
  expect(await stored(page, LAST_SEEN)).toBe(RELEASE);
  expect(await stored(page, WELCOME)).toBe("pending");

  // The version, and a bug report that opens an email with the version filled in.
  await expect(welcome(page)).toContainText(`You’re using Gospel Labs ${displayVersion(RELEASE)}.`);
  const bug = await welcome(page).getByRole("link", { name: "Report a bug" }).getAttribute("href");
  expect(bug).toMatch(/^mailto:gospellabs@proton\.me\?/);
  expect(decodeURIComponent(bug ?? "")).toContain(`App version: ${RELEASE}`);

  // Choosing a look applies at once: until then the device decides, and Evening is one tap away.
  const looks = welcome(page).getByRole("group", { name: "Choose your look" });
  await expect(looks.getByRole("radio", { name: /^Follow my device/ })).toBeChecked();
  await pick(looks.getByRole("radio", { name: /^Evening/ }));
  await expect(page.locator("html")).toHaveAttribute("data-theme", "evening");

  // The tour, from the keyboard: Next keeps focus from step to step.
  await welcome(page).getByRole("button", { name: "Take a quick tour" }).click();
  const tour = page.getByRole("dialog", { name: "A quick tour" });
  await expect(tour).toContainText("Step 1 of 6");
  await expect(tour.getByRole("button", { name: "Next" })).toBeFocused();
  for (let step = 2; step <= 6; step++) {
    await page.keyboard.press("Enter");
    await expect(tour).toContainText(`Step ${step} of 6`);
  }
  await expect(tour).toContainText("Your study stays with you");
  await tour.getByRole("button", { name: "Start studying" }).click();
  await expect(tour).toBeHidden();

  // Finishing the tour from the welcome finishes the welcome too, and focus stays on the page.
  await expect(welcome(page)).toHaveCount(0);
  expect(await stored(page, WELCOME)).toBe("done");
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(welcome(page)).toHaveCount(0);
  await expect(whatsNew(page)).toHaveCount(0);
});

test("someone returning from 1.1 sees what changed in every release since, on whatever page they open, until dismissed", async ({ page }) => {
  await createDatabaseAs1_1(page);
  await page.goto("/investigate");
  const card = whatsNew(page);
  await expect(card).toBeVisible();
  await expect(card.getByRole("heading", { level: 2 })).toHaveText(`Gospel Labs has been updated to ${displayVersion(RELEASE)}`);
  await expect(card).toContainText(`${displayVersion(LATEST.version)} · ${LATEST.title}`);
  for (const highlight of LATEST.highlights) await expect(card).toContainText(highlight);
  // A major update with a new look offers a darker one right here.
  await expect(card.getByRole("group", { name: "Choose your look" }).getByRole("radio", { name: /^Evening/ })).toBeVisible();

  // Earlier releases since 1.1 are one click away; 1.1 itself isn't repeated.
  const earlier = since("1.1.0").slice(1);
  await card.getByText(`Earlier: ${earlier.map((r) => displayVersion(r.version)).join(", ")}`).click();
  for (const release of earlier) await expect(card).toContainText(`${displayVersion(release.version)} · ${release.title}`);
  await expect(card).not.toContainText(`${displayVersion("1.1.0")} ·`);
  // 2.0 was a major update, so the tour is offered.
  await expect(card.getByRole("button", { name: "Take a quick tour" })).toBeVisible();

  // Returning learners never get the welcome as well.
  await page.goto("/");
  await expect(whatsNew(page)).toBeVisible();
  await expect(welcome(page)).toHaveCount(0);

  await whatsNew(page).getByRole("button", { name: "Got it" }).click();
  await expect(whatsNew(page)).toHaveCount(0);
  expect(await stored(page, LAST_SEEN)).toBe(RELEASE);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(whatsNew(page)).toHaveCount(0);
  await expect(welcome(page)).toHaveCount(0);
});

test("someone returning from 2.0 sees only what changed since 2.0", async ({ page }) => {
  // Study preferences are only written by 2.0 and later.
  await seed(page, { "gospel-labs:preferences": JSON.stringify({ studyLength: "deep" }) });
  await page.goto("/");
  const card = whatsNew(page);
  await expect(card).toBeVisible();
  for (const release of since("2.0.0")) await expect(card).toContainText(`${displayVersion(release.version)} · ${release.title}`);
  await expect(card).not.toContainText("2.0.0 ·");
  if (!since("2.0.0").some((release) => release.kind === "major")) {
    await expect(card.getByRole("button", { name: "Take a quick tour" })).toHaveCount(0);
  }
});

test("a recorded version shows only newer releases, and nothing once current", async ({ page }) => {
  await seed(page, { [LAST_SEEN]: "2.0.0", [WELCOME]: "done" });
  await page.goto("/settings");
  await expect(whatsNew(page)).toContainText(`${displayVersion(LATEST.version)} · ${LATEST.title}`);
  await whatsNew(page).getByRole("button", { name: "Dismiss what’s new" }).click();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(whatsNew(page)).toHaveCount(0);
});

test("someone on the release before sees just what changed since, as a one-line note if it was only content", async ({ page }) => {
  const previous = ANNOUNCED[1];
  await seed(page, { [LAST_SEEN]: previous.version, [WELCOME]: "done" });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  if (isContentOnly(since(previous.version))) {
    const note = page.getByRole("complementary", { name: "New content" });
    await expect(note).toContainText(`New content in ${displayVersion(LATEST.version)}: ${LATEST.title}.`);
    await expect(whatsNew(page)).toHaveCount(0);
    await note.getByRole("button", { name: "Got it" }).click();
    await expect(note).toHaveCount(0);
  } else {
    await expect(whatsNew(page)).toContainText(`${displayVersion(LATEST.version)} · ${LATEST.title}`);
    await expect(whatsNew(page)).not.toContainText(`${displayVersion(previous.version)} ·`);
    await whatsNew(page).getByRole("button", { name: "Got it" }).click();
  }
  expect(await stored(page, LAST_SEEN)).toBe(RELEASE);
});

test("someone who has seen every release but patches gets nothing, and is marked current", async ({ page }) => {
  await seed(page, { [LAST_SEEN]: LATEST.version, [WELCOME]: "done" });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect.poll(() => stored(page, LAST_SEEN)).toBe(RELEASE);
  await expect(whatsNew(page)).toHaveCount(0);
  await expect(page.getByRole("complementary", { name: "New content" })).toHaveCount(0);
});

test("Settings › About shows the version, every release, and the tour", async ({ page }) => {
  await seed(page, { [LAST_SEEN]: RELEASE, [WELCOME]: "done" });
  await page.goto("/settings/about");
  const about = page.getByRole("main");
  await expect(about).toContainText(`Version ${RELEASE}`);
  // Every release, patches included.
  await expect(about).toContainText(`${displayVersion(RELEASES[0].version)} · ${RELEASES[0].title}`);
  await about.getByText("Earlier releases").click();
  for (const release of RELEASES.slice(1)) await expect(about).toContainText(`${displayVersion(release.version)} · ${release.title}`);
  await about.getByRole("button", { name: "Take a quick tour" }).click();
  await expect(page.getByRole("dialog", { name: "A quick tour" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "A quick tour" })).toBeHidden();
});

test("the welcome, the tour, and What's new have no accessibility violations", async ({ page }) => {
  // Motion off (as in study-a11y.spec.ts), so axe measures colors after, not during, entrance fades.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript({ path: AXE_PATH });
  await page.goto("/");
  await expect(welcome(page)).toBeVisible();
  await expectNoViolations(page, "the welcome card", welcome(page));
  await welcome(page).getByRole("button", { name: "Take a quick tour" }).click();
  await expectNoViolations(page, "the tour", page.getByRole("dialog", { name: "A quick tour" }));
  await page.keyboard.press("Escape");

  await page.evaluate(([key]) => localStorage.setItem(key, "2.0.0"), [LAST_SEEN]);
  await page.goto("/investigate");
  await expect(whatsNew(page)).toBeVisible();
  await expectNoViolations(page, "What's new", whatsNew(page));
});

test("restoring a backup on a new device restores its preferences by default, and the welcome steps aside", async ({ page }, testInfo) => {
  await page.goto("/settings/data");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // Nothing was stored here before, so this device counts as new until the backup arrives.
  await expect.poll(() => stored(page, WELCOME)).toBe("pending");

  const path = testInfo.outputPath("backup-from-2-0.json");
  writeFileSync(path, BACKUP_FROM_2_0);
  await page.locator('input[type="file"]').setInputFiles(path);
  const dialog = page.getByRole("dialog", { name: "Import backup" });
  // This device has no preferences of its own, so there's nothing for the backup's to overwrite.
  await expect(dialog.getByRole("checkbox", { name: /Also restore appearance and study preferences/ })).toBeChecked();
  await dialog.getByRole("button", { name: "Import", exact: true }).click();
  await expect(page.getByText(/Appearance and study preferences restored\./)).toBeVisible();

  expect(await stored(page, WELCOME)).toBe("done");
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(welcome(page)).toHaveCount(0);
});
