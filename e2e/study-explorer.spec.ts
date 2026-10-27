/**
 * Scripture Explorer: select words with the mouse or the keyboard, save a
 * highlight with a theme and a note, find it again after a reload, read what
 * a key phrase means, work an activity that resumes where it was left, and
 * save the passage (with its highlight) to the Notebook and Map.
 */
import { expect, test, type Page } from "@playwright/test";
import type { ActivityOf } from "@/domain/study/content-schema";
import type { DiscoveryCard, Exploration } from "@/domain/study/user-data";
import { getPassage, getSource } from "@/lib/study-content";
import { activitySection, checkButton, expectStored, fitsTheEvidence, pick, readStore, solveActivity } from "./study-helpers";
import { putStoredRecord } from "./study-raw-storage";

const PASSAGE_ID = "he-will-take-upon-him";
const passage = getPassage(PASSAGE_ID)!;
const reference = getSource(passage.sourceId)!.label; // "Alma 7:11–13"

const words = (page: Page) => page.getByRole("group", { name: `${reference}, words you can highlight` });
const word = (page: Page, verse: number, text: string) => words(page).locator(`[data-verse="${verse}"]`).getByRole("button", { name: text, exact: true });
const newHighlight = (page: Page) => page.getByRole("region", { name: /^New highlight/ });
const highlights = (page: Page) => page.getByRole("region", { name: /^Your highlights/ });

async function openPassage(page: Page) {
  await page.goto(`/explore/${PASSAGE_ID}`);
  await expect(page.getByRole("heading", { level: 1, name: passage.title })).toBeVisible();
  // Words can be selected once saved highlights have loaded.
  await expect(word(page, 11, "suffering")).toBeEnabled();
}

test("words selected with the mouse are saved as a highlight with a theme and a note, and persist", async ({ page }) => {
  await openPassage(page);
  // Tap the first and last words of the phrase.
  await word(page, 11, "suffering").click();
  await word(page, 11, "afflictions").click();
  const editor = newHighlight(page);
  await expect(editor.getByRole("heading")).toHaveText("New highlight · Alma 7:11");
  await expect(editor.getByRole("blockquote")).toHaveText("suffering pains and afflictions");
  await expect(word(page, 11, "pains").first()).toHaveAttribute("aria-pressed", "true");

  await pick(editor.getByRole("group", { name: /^Theme/ }).getByRole("radio", { name: "Adversity and trials" }));
  await editor.getByRole("textbox", { name: /^Note/ }).fill("Every kind, so mine too.");
  await editor.getByRole("button", { name: "Save highlight" }).click();
  await expect(editor).toHaveCount(0);

  const saved = highlights(page).getByRole("listitem");
  await expect(saved).toHaveCount(1);
  await expect(saved).toContainText("Alma 7:11");
  await expect(saved.locator("mark")).toHaveText("suffering pains and afflictions");
  await expect(saved).toContainText("Adversity and trials");
  await expect(saved).toContainText("Every kind, so mine too.");
  // The words are marked in the passage itself.
  await expect(words(page).locator("mark")).toHaveText("suffering pains and afflictions");

  await page.reload();
  await expect(highlights(page).getByRole("listitem")).toHaveCount(1);
  await expect(highlights(page).getByRole("listitem")).toContainText("Every kind, so mine too.");
  const [exploration] = await readStore<Exploration>(page, "explorations");
  expect(exploration.highlights).toMatchObject([{ verse: 11, conceptId: "adversity", note: "Every kind, so mine too." }]);

  // Edit the note, then remove the highlight (confirming first).
  await highlights(page).getByRole("button", { name: /^Edit/ }).click();
  await highlights(page).getByRole("textbox", { name: /^Note/ }).fill("Every kind.");
  await highlights(page).getByRole("button", { name: "Save changes" }).click();
  await expect(highlights(page).getByRole("listitem")).toContainText("Every kind.");
  await highlights(page).getByRole("button", { name: /^Remove/ }).click();
  await highlights(page).getByRole("group", { name: "Remove this highlight?" }).getByRole("button", { name: "Remove" }).click();
  await expect(highlights(page).getByText("No highlights yet.")).toBeVisible();
});

test("words can be selected and saved with the keyboard alone", async ({ page }) => {
  await openPassage(page);
  // The passage is one tab stop: Tab reaches its first word.
  const first = words(page).getByRole("button").first();
  for (let i = 0; i < 60 && !(await first.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab");
  await expect(first).toBeFocused();
  await expect(words(page).getByRole("button").nth(1)).toHaveAttribute("tabindex", "-1");

  // Down to verse 12, right to "take", Enter to select it, Shift+Right twice to extend.
  await page.keyboard.press("ArrowDown");
  await expect(word(page, 12, "And")).toBeFocused();
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
  await expect(word(page, 12, "take").first()).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("Shift+ArrowRight");
  await expect(newHighlight(page).getByRole("blockquote")).toHaveText("take upon him");

  // Escape clears the selection; select again and save from the keyboard.
  // Focus stays on the word last reached ("him"), even though the words regroup as the selection changes.
  await page.keyboard.press("Escape");
  await expect(newHighlight(page)).toHaveCount(0);
  await expect(word(page, 12, "him").first()).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Shift+ArrowLeft");
  await expect(newHighlight(page).getByRole("blockquote")).toHaveText("upon him");
  const save = newHighlight(page).getByRole("button", { name: "Save highlight" });
  for (let i = 0; i < 40 && !(await save.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab");
  await expect(save).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(highlights(page).getByRole("listitem").locator("mark")).toHaveText("upon him");
});

test("a key phrase shows what it means, and can be highlighted from there", async ({ page }) => {
  await openPassage(page);
  const phrase = passage.keyPhrases.find((p) => p.phrase.startsWith("how to succor"))!;
  await page.getByRole("tab", { name: "Key words" }).click();
  const panel = page.getByRole("tabpanel", { name: "Key words" });
  await panel.getByText(phrase.phrase, { exact: true }).click();
  const item = panel.getByRole("group").filter({ hasText: phrase.meaning });
  await expect(item.getByText(phrase.meaning)).toBeVisible();
  await expect(item.getByText("Suggested by Gospel Labs")).toBeVisible();
  await item.getByRole("button", { name: "Show in the passage" }).click();
  await expect(item.getByRole("button", { name: "Show in the passage" })).toHaveAttribute("aria-pressed", "true");

  await item.getByRole("button", { name: "Highlight this phrase" }).click();
  // Whole words are selected, so the phrase keeps the punctuation attached to its last word.
  const selected = new RegExp(`^${phrase.phrase}[.,;:]?$`);
  await expect(newHighlight(page).getByRole("blockquote")).toHaveText(selected);
  // Focus goes to the note, ready to write.
  await expect(newHighlight(page).getByRole("textbox", { name: /^Note/ })).toBeFocused();
  await page.keyboard.type("He knows how, because He lived it.");
  await newHighlight(page).getByRole("button", { name: "Save highlight" }).click();
  await expect(highlights(page).getByRole("listitem").locator("mark")).toHaveText(selected);
});

test("an activity resumes where it was left, and finishing it is counted on its tab", async ({ page }) => {
  await openPassage(page);
  const activity = passage.activities.find((a) => a.type === "sort") as ActivityOf<"sort">;
  await page.getByRole("tab", { name: /^Activities/ }).click();
  await expect(page.getByRole("tab", { name: /^Activities/ })).toHaveAccessibleName("Activities");
  const section = activitySection(page.getByRole("tabpanel", { name: /^Activities/ }), activity);
  const [item] = activity.items;
  const category = activity.categories.find((c) => c.id === item.category)!;
  await section.getByRole("group", { name: item.text, exact: true }).getByRole("radio", { name: category.label, exact: true }).check();

  // Reload straight away: the choice was saved at once.
  await page.reload();
  await page.getByRole("tab", { name: /^Activities/ }).click();
  await expect(section.getByRole("group", { name: item.text, exact: true }).getByRole("radio", { name: category.label, exact: true })).toBeChecked();

  await solveActivity(page, page.getByRole("tabpanel", { name: /^Activities/ }), activity);
  await expect(page.getByRole("tab", { name: /^Activities/ })).toHaveAccessibleName("Activities 1 completed");
  await page.reload();
  await page.getByRole("tab", { name: /^Activities/ }).click();
  await expect(fitsTheEvidence(section)).toBeVisible();
  await expect(checkButton(section)).toHaveCount(0);
});

test("saving to the Notebook & Map creates one card with the highlight, and saving again updates it", async ({ page }) => {
  await openPassage(page);
  await word(page, 12, "succor").click();
  await pick(newHighlight(page).getByRole("radio", { name: "Succor" }));
  await newHighlight(page).getByRole("textbox", { name: /^Note/ }).fill("To run to help.");
  await newHighlight(page).getByRole("button", { name: "Save highlight" }).click();

  const save = page.getByRole("region", { name: "Save to Notebook" });
  await expect(save.getByRole("listitem").filter({ hasText: "highlight" }).first()).toContainText("1");
  await save.getByRole("button", { name: "Save to Notebook" }).click();
  await expect(save.getByText("Saved to your Notebook.")).toBeVisible();
  await expect(save.getByRole("button", { name: "Update Notebook card" })).toBeVisible();
  const [card] = await readStore<DiscoveryCard>(page, "discoveries");
  expect(card).toMatchObject({ origin: { kind: "passage", contentId: PASSAGE_ID }, title: passage.title });
  expect(card.highlights).toMatchObject([{ verse: 12, text: "succor", note: "To run to help.", conceptId: "succor" }]);
  // The tagged theme counts as worked with; the others are suggested.
  expect(card.concepts.find((c) => c.ref.endsWith(":succor"))?.demonstrated).toBe(true);

  // Saving again updates the same card.
  await save.getByRole("button", { name: "Update Notebook card" }).click();
  await expect(save.getByText("Saved to your Notebook.")).toBeVisible();
  expect((await readStore<DiscoveryCard>(page, "discoveries")).map((c) => c.id)).toEqual([card.id]);

  await save.getByRole("link", { name: "Open in Notebook" }).click();
  await expect(page.getByRole("heading", { level: 1, name: passage.title })).toBeVisible();
  const saved = page.getByRole("region", { name: "Highlights" }).getByRole("listitem");
  await expect(saved.getByRole("blockquote")).toHaveText("succor");
  await expect(saved).toContainText(`${reference}, verse 12 · Succor`);
  await expect(saved).toContainText("Your interpretation");
  await expect(saved).toContainText("To run to help.");
  await expect(page.getByRole("complementary", { name: "Sources explored" })).toContainText(reference);
});

test("on phones, a compact bar keeps Save in reach while words are selected", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "The compact bar appears below the lg breakpoint only.");
  await openPassage(page);
  await word(page, 12, "succor").click();
  const save = page.getByRole("button", { name: "Save", exact: true });
  await expect(save).toBeInViewport();
  await expect(page.getByText("“succor”")).toBeVisible();

  // "Theme or note" moves to the full editor without saving.
  await page.getByRole("button", { name: "Theme or note" }).click();
  await expect(newHighlight(page)).toBeInViewport();
  await expect(highlights(page).getByRole("listitem")).toHaveCount(0);

  // Save from the bar: the highlight is kept with no theme or note, and the bar goes away.
  await save.click();
  await expect(save).toHaveCount(0);
  await expect(highlights(page).getByRole("listitem")).toHaveCount(1);
  await expect(highlights(page).getByRole("listitem").locator("mark")).toHaveText("succor");
  const [exploration] = await readStore<Exploration>(page, "explorations");
  expect(exploration.highlights).toMatchObject([{ verse: 12, note: "" }]);
});

test("on phones, Save in the compact bar keeps the theme and note written in the full editor", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "The compact bar appears below the lg breakpoint only.");
  await openPassage(page);
  await word(page, 12, "succor").click();
  await page.getByRole("button", { name: "Theme or note" }).click();
  await pick(newHighlight(page).getByRole("radio", { name: "Succor" }));
  await newHighlight(page).getByRole("textbox", { name: /^Note/ }).fill("To run to help.");

  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(newHighlight(page)).toHaveCount(0);
  await expect(highlights(page).getByRole("listitem")).toContainText("To run to help.");
  await expectStored<Exploration>(page, "explorations", ([record]) => record?.highlights[0]?.note === "To run to help.");
  const [exploration] = await readStore<Exploration>(page, "explorations");
  expect(exploration.highlights).toMatchObject([{ verse: 12, conceptId: "succor", note: "To run to help." }]);
});

test("if saved work on a passage can't be read, the passage can still be read and nothing is changed", async ({ page }) => {
  await openPassage(page);
  // Saved highlights and a note, in a record this version can't read (here, a damaged date).
  const damaged = {
    id: `passage:${PASSAGE_ID}`,
    kind: "passage",
    contentId: PASSAGE_ID,
    firstAt: "not a date",
    updatedAt: "2026-10-20T10:00:00.000Z",
    completedActivities: [],
    vocabulary: [],
    highlights: [{ id: "kept", verse: 11, start: 0, end: 3, note: "Mine to keep", createdAt: "2026-10-20T10:00:00.000Z" }],
    note: "",
  };
  await putStoredRecord(page, "explorations", damaged);
  await page.reload();

  const notice = page.getByRole("alert").filter({ hasText: "Your highlights and activities can’t be opened right now." });
  await expect(notice).toBeVisible();
  await expect(notice.getByRole("button", { name: "Try again" })).toBeVisible();
  // Reading works; highlighting, activities, and saving a card wait, since saving now would replace the stored work.
  await expect(words(page)).toBeVisible();
  await expect(word(page, 11, "suffering")).toBeDisabled();
  await expect(highlights(page).getByText("Your highlights can’t be shown until your saved work can be read.")).toBeVisible();
  const save = page.getByRole("region", { name: "Save to Notebook" });
  await expect(save.getByRole("button", { name: "Save to Notebook" })).toBeDisabled();
  await page.getByRole("tab", { name: /^Activities/ }).click();
  await expect(page.getByText("Activities open once your saved work on this passage can be read.")).toBeVisible();

  await notice.getByRole("button", { name: "Try again" }).click();
  await expect(notice).toBeVisible();
  expect(await readStore(page, "explorations")).toEqual([damaged]);
  expect(await readStore(page, "discoveries")).toEqual([]);
});
