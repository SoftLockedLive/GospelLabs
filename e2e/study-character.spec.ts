/**
 * Character of Christ: nine attributes to learn about, never to be measured
 * by. Opening a word records only that it was opened ("Explored · 1 word"),
 * finishing an activity adds it to the attribute's Discovery Card, and
 * nothing anywhere is scored, counted toward a goal, or ranked.
 */
import { expect, test, type Locator, type Page } from "@playwright/test";
import type { DiscoveryCard, Exploration } from "@/domain/study/user-data";
import { listAttributes } from "@/lib/study-content";
import { activitySection, expectNoScoring, expectStored, readStore, solveActivity } from "./study-helpers";
import { putStoredRecord } from "./study-raw-storage";

const meekness = listAttributes().find((attribute) => attribute.id === "meekness")!;
const longSuffering = listAttributes().find((attribute) => attribute.id === "long-suffering")!;
const attributeCard = (page: Page, name: string) => page.getByRole("article").filter({ has: page.getByRole("heading", { level: 3, name, exact: true }) });
/** Below the sm breakpoint (640px), where the long lists start collapsed. */
const onPhone = (page: Page) => (page.viewportSize()?.width ?? 1280) < 640;
const top = async (locator: Locator) => (await locator.boundingBox())!.y;

test("the overview shows the nine attributes without scores, percentages, or rankings", async ({ page }) => {
  await page.goto("/character");
  await expect(page.getByRole("heading", { level: 1, name: "Learn of Him" })).toBeVisible();
  const attributes = page.getByRole("region", { name: "Attributes of the Savior" }).getByRole("article");
  await expect(attributes).toHaveCount(9);
  await expect(attributes.getByRole("heading", { level: 3 })).toHaveText(listAttributes().map((attribute) => attribute.name));
  await expectNoScoring(page);
  // The attributes come first, so the first screen offers one to open; the introduction, with its citation, follows them.
  await expect(attributes.first()).toBeInViewport();
  const intro = page.getByRole("region", { name: "About the Character of Christ" });
  await expect(intro.getByRole("link", { name: /Preach My Gospel/ })).toBeVisible();
  expect(await top(intro)).toBeGreaterThan(await top(page.getByRole("region", { name: "Attributes of the Savior" })));

  // "How they connect" filters to one attribute's connections, each citing its sources.
  const connect = page.getByRole("region", { name: "How they connect" });
  const every = connect.getByRole("list", { name: "Every connection the sources make" }).getByRole("listitem");
  if (onPhone(page)) {
    // On a phone, the full list (many screens long) waits behind one button.
    await expect(every).toHaveCount(0);
    await connect.getByRole("button", { name: /^Show \d+ connections$/ }).click();
  }
  await expect(every.first()).toBeVisible();
  await connect.getByRole("group", { name: "Show the connections of" }).getByRole("button", { name: "Meekness" }).click();
  await expect(connect.getByRole("group", { name: "Show the connections of" }).getByRole("button", { name: "Meekness" })).toHaveAttribute("aria-pressed", "true");
  for (const item of await connect.getByRole("listitem").filter({ has: page.getByRole("list", { name: "Sources" }) }).all()) {
    await expect(item).toContainText(/meekness/i);
  }
});

test("opening a word records that it was explored, and finishing an activity adds it to the Notebook card", async ({ page }) => {
  await page.goto(`/character/${meekness.id}`);
  await expect(page.getByRole("heading", { level: 1, name: meekness.name })).toBeVisible();

  // "Try an activity", near the top, goes straight to the activities.
  await page.getByRole("link", { name: "Try an activity" }).click();
  await expect(page).toHaveURL(/#activities$/);
  await expect(page.getByRole("heading", { level: 2, name: "Look closer" })).toBeInViewport();

  // Open a word: its meaning appears, and the page notes that one word was explored.
  const [word] = meekness.vocabulary;
  const words = page.getByRole("region", { name: "Words to know" });
  await words.getByRole("button", { name: word.term }).click();
  await expect(words.getByRole("button", { name: word.term })).toHaveAttribute("aria-expanded", "true");
  await expect(words.getByText(word.meaning)).toBeVisible();
  await expect(page.getByText("Explored · 1 word", { exact: true })).toBeVisible();

  // Back on the overview, the attribute shows the same quiet note.
  await page.getByRole("link", { name: "Character of Christ" }).first().click();
  await expect(attributeCard(page, meekness.name)).toContainText("Explored · 1 word");
  await expect(attributeCard(page, "Charity")).not.toContainText("Explored");

  // Work the vocabulary-matching activity.
  await page.goto(`/character/${meekness.id}`);
  const activity = meekness.activities.find((a) => a.type === "vocab-match")!;
  const lookCloser = page.getByRole("region", { name: "Look closer" });
  await lookCloser.getByRole("tablist", { name: `${meekness.name} activities` }).getByRole("tab", { name: "Vocabulary Matching" }).click();
  const panel = lookCloser.getByRole("tabpanel", { name: "Vocabulary Matching" });
  await solveActivity(page, panel, activity);
  await expect(panel.getByRole("status").filter({ hasText: "Added to your Notebook card" })).toBeVisible();
  await expect(page.getByText("Explored · 1 word · 1 activity", { exact: true })).toBeVisible();
  await expect(lookCloser.getByRole("tab", { name: "Vocabulary Matching (completed)" })).toBeVisible();

  const [card] = await readStore<DiscoveryCard>(page, "discoveries");
  expect(card.origin).toMatchObject({ kind: "attribute", contentId: meekness.id });
  const exploration = (await readStore<Exploration>(page, "explorations")).find((e) => e.id === `attribute:${meekness.id}`)!;
  expect(exploration).toMatchObject({ vocabulary: [word.id], completedActivities: [activity.id] });

  // "Keep what you've studied" now offers to update the card and to open it.
  const keep = page.getByRole("region", { name: "Keep what you’ve studied" });
  await keep.getByRole("button", { name: "Update Notebook card" }).click();
  await expect(keep.getByText("Saved to your Notebook.")).toBeVisible();
  expect((await readStore<DiscoveryCard>(page, "discoveries")).map((c) => c.id)).toEqual([card.id]);
  await keep.getByRole("link", { name: "Open in Notebook" }).click();
  await expect(page.getByRole("heading", { level: 1, name: card.title })).toBeVisible();
  await expect(page.getByRole("article", { name: card.title }).getByText("Character of Christ", { exact: true })).toBeVisible();

  await page.goto("/character");
  await expect(attributeCard(page, meekness.name)).toContainText("Explored · 1 word · 1 activity");
  await expectNoScoring(page);
});

test("an attribute can be saved to the Notebook without doing anything else, and appears on the Map", async ({ page }) => {
  await page.goto(`/character/${meekness.id}`);
  const keep = page.getByRole("region", { name: "Keep what you’ve studied" });
  await keep.getByRole("button", { name: "Save to Notebook" }).click();
  await expect(keep.getByText("Saved to your Notebook.")).toBeVisible();
  await keep.getByRole("link", { name: "See on Map" }).click();
  await expect(page).toHaveURL(`/map?node=${encodeURIComponent(`attribute:${meekness.id}`)}`);
  await expect(page.getByRole("complementary", { name: meekness.name })).toBeVisible();
  // The attribute page itself never scores.
  await page.goto(`/character/${meekness.id}`);
  await expectNoScoring(page);
  await expect(activitySection(page, meekness.activities[0])).toBeVisible();
});

const MEEKNESS_ID = `attribute:${meekness.id}`;
const storedMeekness = async (page: Page) => (await readStore<Exploration>(page, "explorations")).find((record) => record.id === MEEKNESS_ID);

test("visiting an attribute again is recorded without counting as an edit", async ({ page }) => {
  await page.goto(`/character/${meekness.id}`);
  const [word] = meekness.vocabulary;
  await page.getByRole("region", { name: "Words to know" }).getByRole("button", { name: word.term }).click();
  await expect(page.getByText("Explored · 1 word", { exact: true })).toBeVisible();
  await expectStored<Exploration>(page, "explorations", (records) => !!records.find((r) => r.id === MEEKNESS_ID)?.vocabulary.includes(word.id));
  const edited = (await storedMeekness(page))!;

  await page.reload();
  await expect(page.getByText("Explored · 1 word", { exact: true })).toBeVisible();
  await expect.poll(async () => (await storedMeekness(page))?.lastOpenedAt ?? "").not.toBe(edited.lastOpenedAt ?? "");
  // A backup merge keeps the more recently updated copy, so a visit must not outrank a copy with more work in it.
  expect(await storedMeekness(page)).toMatchObject({ firstAt: edited.firstAt, updatedAt: edited.updatedAt, vocabulary: [word.id] });
});

test("a saved record that can't be read is left untouched, and the page says why", async ({ page }) => {
  await page.goto(`/character/${meekness.id}`);
  await expectStored<Exploration>(page, "explorations", (records) => records.some((r) => r.id === MEEKNESS_ID));
  const damaged = {
    id: MEEKNESS_ID,
    kind: "attribute",
    contentId: meekness.id,
    firstAt: "not a date",
    updatedAt: "2026-10-20T10:00:00.000Z",
    completedActivities: [],
    vocabulary: [],
    highlights: [],
    note: "A note to keep",
  };
  await putStoredRecord(page, "explorations", damaged);
  await page.reload();

  // The note isn't offered for editing: without the saved one, a note typed now would replace it.
  await expect(page.getByText(/Your note can’t be loaded right now/)).toBeVisible();
  await expect(page.getByRole("textbox", { name: /Your private note/ })).toHaveCount(0);
  // Opening a word would be recorded, but the record can't be read: nothing is written, and the page says so.
  await page.getByRole("region", { name: "Words to know" }).getByRole("button", { name: meekness.vocabulary[0].term }).click();
  await expect(page.getByText(/Couldn’t save on this device\. Some saved study data couldn’t be read/)).toBeVisible();
  expect(await storedMeekness(page)).toEqual(damaged);
});

test("on a phone, an attribute's long lists start collapsed, but safety notes never do", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/character/${longSuffering.id}`);
  await expect(page.getByRole("heading", { level: 1, name: longSuffering.name })).toBeVisible();
  // The safety notice beside the definition always shows.
  await expect(page.getByRole("complementary", { name: "If someone is hurting you" })).toBeVisible();

  // An idea that is itself a safety note stays visible; the others wait behind one button.
  const contrasts = page.getByRole("region", { name: "Not to be confused with" });
  const safetyContrast = longSuffering.contrasts.find((contrast) => contrast.id === "long-suffering-not-tolerating-abuse")!;
  const otherContrasts = longSuffering.contrasts.filter((contrast) => contrast !== safetyContrast);
  expect(otherContrasts.length).toBeGreaterThan(0);
  await expect(contrasts.getByRole("heading", { level: 3, name: safetyContrast.title })).toBeVisible();
  for (const contrast of otherContrasts) await expect(contrasts.getByRole("heading", { level: 3, name: contrast.title })).toBeHidden();
  const more = contrasts.getByRole("button", { name: `Show ${otherContrasts.length} more ${otherContrasts.length === 1 ? "idea" : "ideas"}` });
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await more.click();
  for (const contrast of otherContrasts) await expect(contrasts.getByRole("heading", { level: 3, name: contrast.title })).toBeVisible();
  await expect(contrasts.getByRole("button", { name: "Show less" })).toHaveAttribute("aria-expanded", "true");

  // The scriptures wait too; following the "On this page" link to them opens them.
  const scriptures = page.getByRole("region", { name: "In the scriptures" });
  await expect(scriptures.getByRole("listitem")).toHaveCount(0);
  await page.getByRole("navigation", { name: "On this page" }).getByRole("link", { name: "Scriptures" }).click();
  await expect(scriptures.getByRole("listitem")).toHaveCount(longSuffering.scriptures.length);

  // From the Savior's life: the account that carries a safety note shows; the rest wait.
  const savior = page.getByRole("region", { name: "From the Savior’s life" });
  const safetyExample = longSuffering.saviorExamples.find((example) => example.id === "long-suffering-he-suffereth-it")!;
  await expect(savior.getByRole("heading", { level: 3 })).toHaveText([safetyExample.title]);

  // A wider screen shows everything, with no buttons.
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(savior.getByRole("heading", { level: 3 })).toHaveCount(longSuffering.saviorExamples.length);
  await expect(page.getByRole("main").getByRole("button", { name: /^Show (less|\d)/ })).toHaveCount(0);
});

test("a word whose meaning is a safety note starts open", async ({ page }) => {
  const humility = listAttributes().find((attribute) => attribute.id === "humility")!;
  const submit = humility.vocabulary.find((word) => word.term === "Submit")!;
  await page.goto(`/character/${humility.id}`);
  const words = page.getByRole("region", { name: "Words to know" });
  await expect(words.getByRole("button", { name: submit.term })).toHaveAttribute("aria-expanded", "true");
  await expect(words.getByText(submit.meaning)).toBeVisible();
  await expect(words.getByRole("button", { name: humility.vocabulary.find((word) => word !== submit)!.term })).toHaveAttribute("aria-expanded", "false");
  // Starting open isn't the learner opening it: the visit is recorded, the word isn't.
  await expectStored<Exploration>(page, "explorations", (records) => records.some((record) => record.id === `attribute:${humility.id}`));
  expect((await readStore<Exploration>(page, "explorations")).find((record) => record.id === `attribute:${humility.id}`)?.vocabulary).toEqual([]);
});
