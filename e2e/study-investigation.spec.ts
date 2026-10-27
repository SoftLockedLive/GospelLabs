/**
 * A guided investigation from start to discovery, answered through the UI:
 * gentle feedback and hints for wrong answers, "Continue anyway" from the
 * start and "Show me" after two tries, quick vs. deep paths, changing
 * difficulty mid-way, side questions that return to the same step, resuming
 * after a reload, remembering the level and length for the next
 * investigation, and a Discovery Card that keeps what the learner worked out
 * apart from what was shown. Answers come from the investigation's content.
 * Saved progress is never written over by something that can't see it: a
 * record this version can't read, progress from a newer version, or a tab
 * that missed a completion made in another tab.
 *
 * "When Faithful People Suffer" is used throughout: its quick path has five
 * core steps, and a deep session adds one deeper step and two side questions.
 */
import { expect, test, type Page } from "@playwright/test";
import { ACTIVITY_TYPE_LABELS, type CheckedActivity } from "@/domain/study/content-schema";
import { STUDY_DATA_VERSION, type DiscoveryCard, type StudyProgress } from "@/domain/study/user-data";
import { RELATION_PHRASES } from "@/domain/study/vocabulary";
import {
  activityAt,
  activitySection,
  answer,
  checkButton,
  chooseStudySettings,
  completeInvestigation,
  fitsTheEvidence,
  expectNoScoring,
  expectStored,
  investigation,
  pathSteps,
  pick,
  progressSteps,
  readStore,
  solveActivity,
  solveStep,
  startInvestigation,
  startsWith,
  stepArticle,
  wrongResponse,
  wrongTries,
} from "./study-helpers";

const ID = "when-faithful-people-suffer";
const inv = investigation(ID);
const quick = pathSteps(inv, "quick");
const deep = pathSteps(inv, "deep");
const [whoDidSin, hardThings, whereArtThou, descendedBelow, strengthToBear, whoIsWithYou] = deep;
const branchAt = (id: string) => inv.branches.find((branch) => branch.id === id)!;

const stepStatus = (page: Page, index: number) => progressSteps(page).nth(index);

/** Puts records straight into one of the app's IndexedDB stores. Open an app page first so the database exists. */
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

test("a wrong answer points back to the evidence without giving it away, then hints, then Show me after two tries; Continue anyway is there from the start", async ({ page }) => {
  await startInvestigation(page, ID, { difficulty: "medium", length: "quick" });
  const activity = activityAt(whoDidSin, "medium");
  if (activity.type !== "clue") throw new Error("Expected a clue activity on the first step at medium");
  const section = activitySection(stepArticle(page, whoDidSin), activity);
  const correct = activity.question.options.find((option) => activity.question.correct.includes(option.id))!;
  const wrong = activity.question.options.filter((option) => !activity.question.correct.includes(option.id));

  // The question opens once every clue has been examined.
  const group = section.getByRole("group", { name: activity.question.prompt });
  for (const radio of await group.getByRole("radio").all()) await expect(radio).toBeDisabled();
  await expect(section.getByText("Examine every clue to answer.")).toBeVisible();
  // Hints are available from the start, quietly, and so is moving on: nobody is held on a step.
  await expect(section.getByRole("button", { name: "Need a hint?" })).toBeVisible();
  await expect(section.getByRole("button", { name: "Continue anyway" })).toBeVisible();
  await expect(section.getByRole("button", { name: "Show me" })).toHaveCount(0);
  await expect(section.getByText(/^You can keep looking/)).toHaveCount(0);

  // First wrong answer: calm feedback that points at the evidence, never the answer.
  await answer(page, section, activity, wrongResponse(activity, 0));
  await checkButton(section).click();
  await expect(section.getByText("Not yet. Look again at the evidence.")).toBeVisible();
  await expect(section.getByText(wrong[0].feedback!)).toBeVisible();
  await expect(group.getByRole("radio", { name: startsWith(wrong[0].text) })).toHaveAccessibleName(/Look again$/);
  await expect(group.getByRole("radio", { name: startsWith(correct.text) })).toHaveAccessibleName(correct.text);
  await expect(section.getByText(activity.explanation)).toHaveCount(0);
  await expect(fitsTheEvidence(section)).toHaveCount(0);
  // The same answer can't be checked again until it changes.
  await expect(checkButton(section)).toBeDisabled();
  // One try isn't enough to be shown the answer (hints remain).
  await expect(section.getByRole("button", { name: "Show me" })).toHaveCount(0);
  await expect(section.getByText(/^You can keep looking/)).toHaveCount(0);

  // Hints come one at a time, each in the list of hints.
  const hints = section.getByRole("list", { name: "Hints" }).getByRole("listitem");
  await section.getByRole("button", { name: "Need a hint?" }).click();
  await expect(hints).toHaveText([`Hint 1: ${activity.hints[0]}`]);

  // A second try opens "Show me", explained in words.
  await answer(page, section, activity, wrongResponse(activity, 1));
  await checkButton(section).click();
  await expect(section.getByText(wrong[1].feedback!)).toBeVisible();
  await expect(section.getByText("You can keep looking, see the answer with an explanation, or continue and come back later.")).toBeVisible();
  await expect(section.getByRole("button", { name: "Show me" })).toBeVisible();
  await expect(section.getByRole("button", { name: "Continue anyway" })).toBeVisible();

  // When the hints run out, "More help" points to the evidence to reread (labeled as a suggestion).
  expect(activity.hints).toHaveLength(3);
  await section.getByRole("button", { name: "Another hint" }).click();
  await expect(hints).toHaveText([`Hint 1: ${activity.hints[0]}`, `Hint 2: ${activity.hints[1]}`]);
  await section.getByRole("button", { name: "Another hint" }).click();
  await expect(hints).toHaveCount(3);
  await section.getByRole("button", { name: "More help" }).click();
  await expect(hints).toHaveCount(4);
  await expect(hints.last()).toContainText("Lay the clues side by side.");
  await expect(hints.last()).toContainText("Suggested by Gospel Labs");

  // Show me: the answer with its explanation, saved as shown rather than discovered.
  await section.getByRole("button", { name: "Show me" }).click();
  await expect(section.getByText("Here is the answer, and why")).toBeVisible();
  await expect(section.getByText("Because you chose to see the answer, this is saved as “Suggested by Gospel Labs” rather than “You discovered.”")).toBeVisible();
  await expect(section.getByText(activity.explanation)).toBeVisible();
  await expect(group.getByRole("radio", { name: startsWith(correct.text) })).toBeChecked();
  await expect(stepStatus(page, 0)).toHaveAccessibleName(/Step 1: .*, completed with the answer shown/);
  // Nobody is scored for it.
  await expectNoScoring(page);
});

test("Continue anyway moves on at once, even before trying, and the step can be tried again later", async ({ page }) => {
  await startInvestigation(page, ID, { difficulty: "medium", length: "quick" });
  await solveStep(page, whoDidSin, "medium");
  const activity = activityAt(whereArtThou, "medium") as CheckedActivity;
  const section = activitySection(stepArticle(page, whereArtThou), activity);
  // Nothing tried yet: moving on is already offered, the answer isn't.
  await expect(section.getByRole("button", { name: "Continue anyway" })).toBeVisible();
  await expect(section.getByRole("button", { name: "Show me" })).toHaveCount(0);
  await section.getByRole("button", { name: "Continue anyway" }).click();

  // On to the next step, with the skipped one marked "moved on" (not completed).
  await expect(stepArticle(page, whoIsWithYou)).toBeVisible();
  await expect(stepStatus(page, 1)).toHaveAccessibleName(/Step 2: .*, moved on/);
  await expect(stepStatus(page, 2)).toHaveAccessibleName(/Step 3: .*, in progress \(current\)|Step 3: .*, not started \(current\)/);

  // Back to it from the progress path: it can still be worked out.
  await stepStatus(page, 1).click();
  const article = stepArticle(page, whereArtThou);
  await expect(article.getByText("You moved on from this step. You can try it again here any time.")).toBeVisible();
  await answer(page, section, activity);
  await checkButton(section).click();
  await expect(fitsTheEvidence(section)).toBeVisible();
  await expect(stepStatus(page, 1)).toHaveAccessibleName(/Step 2: .*, completed( \(current\))?$/);
});

test("the browser's Back button returns from the steps to the overview, without leaving the investigation", async ({ page }) => {
  const inv = await startInvestigation(page, ID, { difficulty: "medium", length: "quick" });
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/investigate/${ID}$`));
  await expect(page.getByRole("heading", { level: 1, name: inv.title })).toBeVisible();
  await expect(page.getByRole("region", { name: "Continue" }).getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  // Forward again is just a second visit to the overview's way in; Resume goes back to the step.
  await page.getByRole("region", { name: "Continue" }).getByRole("button", { name: "Resume", exact: true }).click();
  await expect(stepArticle(page, pathSteps(inv, "quick")[0])).toBeVisible();
  // The step's own "Overview" link uses the same history entry, so one more Back leaves the investigation.
  await page.getByRole("button", { name: "Overview" }).click();
  await expect(page.getByRole("heading", { level: 1, name: inv.title })).toBeVisible();
  await page.goBack();
  await expect(page).not.toHaveURL(new RegExp(`/investigate/${ID}`));
});

test("quick and deep sessions follow different paths, and only deep sessions offer side questions", async ({ page }) => {
  expect(quick.length).toBeLessThan(deep.length);
  await startInvestigation(page, ID, { difficulty: "medium", length: "quick" });
  await expect(progressSteps(page)).toHaveCount(quick.length);
  await solveStep(page, whoDidSin, "medium", { next: false });
  await expect(page.getByRole("complementary", { name: "A related question" })).toHaveCount(0);
  await page.getByRole("button", { name: "Next step" }).click();
  // The deeper step is left out of a quick session.
  await expect(stepArticle(page, whereArtThou)).toBeVisible();

  // Switching to deep mid-way adds the deeper step, and side questions appear at finished steps.
  await page.getByRole("button", { name: /change difficulty or session length/ }).click();
  const settings = page.getByRole("dialog", { name: "Study settings" });
  await pick(settings.getByRole("radio", { name: /^Deep/ }));
  await settings.getByRole("button", { name: "Done" }).click();
  await expect(progressSteps(page)).toHaveCount(deep.length);
  await expect(stepStatus(page, 1)).toHaveAccessibleName(new RegExp(`Step 2: ${hardThings.title}, not started`));
  await stepStatus(page, 0).click();
  await expect(page.getByRole("complementary", { name: "A related question" })).toContainText(branchAt("easier-for-others").question);
});

test("difficulty can change mid-way without losing finished steps; side questions return to the same step; the discovery keeps provenance", async ({ page }) => {
  await startInvestigation(page, ID, { difficulty: "medium", length: "deep" });
  await expect(progressSteps(page)).toHaveCount(deep.length);

  // Step 1: shown, not worked out.
  const first = activityAt(whoDidSin, "medium") as CheckedActivity;
  const firstSection = activitySection(stepArticle(page, whoDidSin), first);
  await wrongTries(page, firstSection, first);
  await firstSection.getByRole("button", { name: "Show me" }).click();

  // A side question is offered here. Explore it, finish it, and come back to this same step.
  const easier = branchAt("easier-for-others");
  const offer = page.getByRole("complementary", { name: "A related question" });
  await expect(offer).toContainText(easier.question);
  await expect(offer).toContainText("Optional · 1 step · you’ll come right back here");
  await offer.getByRole("button", { name: "Explore" }).click();
  const banner = page.getByRole("region", { name: "Side question" });
  await expect(banner).toContainText("Side question · step 1 of 1");
  await expect(banner).toContainText(easier.question);
  const branchStep = easier.steps[0];
  await solveActivity(page, stepArticle(page, branchStep), activityAt(branchStep, "medium"));
  await expect(page.getByText(easier.returnNote!)).toBeVisible();
  await stepArticle(page, branchStep).getByRole("button", { name: "Return to the investigation" }).click();
  await expect(stepArticle(page, whoDidSin)).toBeVisible();
  await expect(banner).toHaveCount(0);
  await expect(offer.getByText("Explored", { exact: true })).toBeVisible();
  await expect(offer.getByRole("button", { name: "Explore again" })).toBeVisible();
  await expect(stepStatus(page, 0)).toHaveAccessibleName(/Step 1: .*completed with the answer shown \(current\)/);

  // Step 2 (deep only), worked out. Its side question can be left at once, back to the same step.
  await page.getByRole("button", { name: "Next step" }).click();
  await solveStep(page, hardThings, "medium", { next: false });
  const others = branchAt("other-peoples-choices");
  await offer.filter({ hasText: others.question }).getByRole("button", { name: "Explore" }).click();
  await expect(banner).toContainText(others.question);
  await banner.getByRole("button", { name: "Return to the investigation" }).click();
  await expect(stepArticle(page, hardThings)).toBeVisible();
  await expect(stepArticle(page, hardThings).getByRole("region", { name: "What this step brings out" })).toBeVisible();

  // Change difficulty to Easy: both finished steps stay finished, at the level they were done.
  await page.getByRole("button", { name: /change difficulty or session length/ }).click();
  const settings = page.getByRole("dialog", { name: "Study settings" });
  await expect(settings).toContainText("Steps you’ve finished stay finished at the level you did them.");
  await pick(settings.getByRole("radio", { name: /^Easy/ }));
  await settings.getByRole("button", { name: "Done" }).click();
  await expect(page.getByRole("button", { name: /change difficulty or session length/ })).toContainText("Easy · Deep");
  await expect(stepArticle(page, hardThings).getByText("Evidence Connections · Medium")).toBeVisible();
  await expect(stepStatus(page, 0)).toHaveAccessibleName(/completed with the answer shown/);
  await expect(stepStatus(page, 1)).toHaveAccessibleName(/Step 2: .*, completed \(current\)/);

  // Step 3 now comes at Easy. Answer part of it, then reload: position and answer are restored.
  await page.getByRole("button", { name: "Next step" }).click();
  const third = activityAt(whereArtThou, "easy");
  if (third.type !== "sort") throw new Error("Expected a sort activity on step 3 at easy");
  const thirdArticle = stepArticle(page, whereArtThou);
  await expect(thirdArticle.getByText("Sort It Out · Easy")).toBeVisible();
  const [firstItem] = third.items;
  const firstCategory = third.categories.find((category) => category.id === firstItem.category)!;
  await thirdArticle.getByRole("group", { name: firstItem.text, exact: true }).getByRole("radio", { name: firstCategory.label, exact: true }).check();
  await expect
    .poll(async () => {
      const [record] = await readStore<StudyProgress>(page, "studyProgress");
      return record?.steps[whereArtThou.id]?.response;
    })
    .toEqual({ placements: { [firstItem.id]: firstItem.category } });

  await page.reload();
  await expect(page.getByRole("heading", { level: 2, name: "Pick up where you left off" })).toBeVisible();
  await expect(page.getByRole("radio", { name: /^Easy/ })).toBeChecked();
  await expect(page.getByRole("radio", { name: /^Deep/ })).toBeChecked();
  await page.getByRole("button", { name: `Resume · step 3 of ${deep.length}` }).click();
  await expect(thirdArticle).toBeVisible();
  await expect(thirdArticle.getByRole("group", { name: firstItem.text, exact: true }).getByRole("radio", { name: firstCategory.label, exact: true })).toBeChecked();
  await expect(thirdArticle.getByText(`1 of ${third.items.length} placed`)).toBeVisible();

  // Finish the remaining steps at Easy, with an optional reflection at the end.
  await solveStep(page, whereArtThou, "easy");
  await solveStep(page, descendedBelow, "easy");
  await solveStep(page, strengthToBear, "easy");
  await solveStep(page, whoIsWithYou, "easy", { reflection: "Doctrine and Covenants 121:7–8, when it feels heavy.", next: false });
  await page.getByRole("button", { name: "See your discovery" }).click();

  // The discovery: saved, with what was worked out apart from what was shown.
  await expect(page.getByRole("heading", { level: 1, name: inv.title })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Saved to your Notebook." })).toBeVisible();
  const [card] = await readStore<DiscoveryCard>(page, "discoveries");
  expect(card.origin).toMatchObject({ kind: "investigation", contentId: ID, primaryQuestion: inv.primaryQuestion.id });
  const sentence = (c: DiscoveryCard["connections"][number]) => `${c.from.label} ${RELATION_PHRASES[c.relation]} ${c.to.label}`;
  const shownRefs = new Set(whoDidSin.connections.map((c) => `${c.from}|${c.to}`));
  const suggested = card.connections.filter((c) => c.provenance === "suggested");
  const demonstrated = card.connections.filter((c) => c.provenance === "demonstrated");
  // Exactly step 1's connections were shown; everything else (including the side question) was worked out.
  expect(new Set(suggested.map((c) => `${c.from.ref}|${c.to.ref}`))).toEqual(shownRefs);
  const workedOut = [hardThings, whereArtThou, descendedBelow, strengthToBear, whoIsWithYou, ...easier.steps].flatMap((step) => step.connections);
  expect(demonstrated).toHaveLength(new Set(workedOut.map((c) => `${c.from}|${c.relation}|${c.to}`)).size);

  // The full write-up waits under one disclosure, closed at first.
  await expect(page.getByRole("region", { name: "What the evidence shows" })).toBeHidden();
  await page.getByText("See everything you found").click();
  const discovered = page.getByRole("region", { name: "What you discovered" });
  const shown = page.getByRole("region", { name: "Shown along the way" });
  await expect(discovered).toContainText("You discovered");
  await expect(shown).toContainText("Suggested by Gospel Labs");
  for (const connection of demonstrated) await expect(discovered.getByRole("listitem").filter({ hasText: sentence(connection) }).first()).toBeVisible();
  for (const connection of suggested) await expect(shown.getByRole("listitem").filter({ hasText: sentence(connection) }).first()).toBeVisible();
  await expect(page.getByRole("region", { name: "What the evidence shows" })).toContainText(inv.discovery.summary);
  await expect(page.getByRole("region", { name: "Pointing to Christ" })).toContainText(inv.discovery.christConnection);
  await expectNoScoring(page);

  // The reflection stayed on this device, with the progress.
  const [progress] = await readStore<StudyProgress>(page, "studyProgress");
  expect(progress.steps[whoIsWithYou.id]?.reflection).toBe("Doctrine and Covenants 121:7–8, when it feels heavy.");
  expect(progress.completedAt).toBeTruthy();
  expect(progress.discoveryId).toBe(card.id);
});

test("reloading inside a side question, right after a choice, resumes there with the choice kept", async ({ page }) => {
  await startInvestigation(page, ID, { difficulty: "medium", length: "deep" });
  await solveStep(page, whoDidSin, "medium", { next: false });
  const easier = branchAt("easier-for-others");
  await page.getByRole("complementary", { name: "A related question" }).getByRole("button", { name: "Explore" }).click();
  const branchStep = easier.steps[0];
  const activity = activityAt(branchStep, "medium");
  if (activity.type !== "clue") throw new Error("Expected a clue activity in the side question at medium");
  const section = activitySection(stepArticle(page, branchStep), activity);
  await expect
    .poll(async () => (await readStore<StudyProgress>(page, "studyProgress"))[0]?.position)
    .toMatchObject({ stepId: branchStep.id, branchId: easier.id });

  // Examine one clue and reload at once, as someone closing the tab right after a tap would.
  await section.getByRole("button", { name: /^Clue 1\b/ }).click();
  await expect(section.getByText(`1 of ${activity.clues.length} examined`)).toBeVisible();
  await page.reload();
  // Resume is offered right under the question, without scrolling past the introduction.
  await page.getByRole("region", { name: "Continue" }).getByRole("button", { name: "Resume", exact: true }).click();
  const banner = page.getByRole("region", { name: "Side question" });
  await expect(banner).toContainText(easier.question);
  await expect(section.getByText(`1 of ${activity.clues.length} examined`)).toBeVisible();
  await expect(section.getByRole("button", { name: /^Clue 1\b/ })).toHaveAttribute("aria-expanded", "true");

  // Returning still comes back to the step the side question was opened from.
  await banner.getByRole("button", { name: "Return to the investigation" }).click();
  await expect(stepArticle(page, whoDidSin)).toBeVisible();
  await expect(stepStatus(page, 0)).toHaveAccessibleName(/Step 1: .*, completed \(current\)/);
});

test("study preferences choose the starting difficulty and length of a new investigation", async ({ page }) => {
  await page.goto("/settings");
  const preferences = page.getByRole("region", { name: "Study preferences" });
  await pick(preferences.getByRole("radio", { name: /^Deep study/ }));
  await pick(preferences.getByRole("radio", { name: /^Complex/ }));

  await page.goto(`/investigate/${ID}`);
  await expect(page.getByRole("group", { name: "Difficulty" }).getByRole("radio", { name: /^Complex/ })).toBeChecked();
  await expect(page.getByRole("group", { name: "Session" }).getByRole("radio", { name: /^Deep/ })).toBeChecked();
  await page.getByRole("button", { name: "Begin the investigation" }).click();
  await expect(progressSteps(page)).toHaveCount(deep.length);
  await expect(stepArticle(page, whoDidSin).getByText(`${ACTIVITY_TYPE_LABELS[activityAt(whoDidSin, "complex").type]} · Complex`)).toBeVisible();
  await expect(page.getByRole("button", { name: /change difficulty or session length/ })).toContainText("Complex · Deep");
  const [progress] = await readStore<StudyProgress>(page, "studyProgress");
  expect(progress).toMatchObject({ difficulty: "complex", length: "deep" });
});

test("a new learner starts at Easy, and the level and length they begin with open the next investigation the same way", async ({ page }) => {
  await page.goto(`/investigate/${ID}`);
  const difficulty = page.getByRole("group", { name: "Difficulty" });
  const session = page.getByRole("group", { name: "Session" });
  await expect(difficulty.getByRole("radio", { name: /^Easy/ })).toBeChecked();
  await expect(session.getByRole("radio", { name: /^Quick/ })).toBeChecked();
  await expect(page.getByRole("region", { name: "Begin" })).toContainText("Easy · Quick");

  await chooseStudySettings(page, { difficulty: "hard", length: "deep" });
  await page.getByRole("button", { name: "Begin the investigation" }).click();
  await expect(stepArticle(page, deep[0])).toBeVisible();

  // The next investigation opens at Hard and Deep, and Settings shows them as the preferences.
  await page.goto("/investigate/one-by-one");
  await expect(difficulty.getByRole("radio", { name: /^Hard/ })).toBeChecked();
  await expect(session.getByRole("radio", { name: /^Deep/ })).toBeChecked();
  await page.goto("/settings");
  const preferences = page.getByRole("region", { name: "Study preferences" });
  await expect(preferences.getByRole("radio", { name: /^Hard/ })).toBeChecked();
  await expect(preferences.getByRole("radio", { name: /^Deep study/ })).toBeChecked();
});

test("studying a finished investigation again updates the same Discovery Card, and a deleted card can be saved again", async ({ page }) => {
  const done = await completeInvestigation(page, ID, { difficulty: "easy", length: "quick" });
  await page.getByRole("textbox", { name: /Your note/ }).fill("First time through.");
  await expect.poll(async () => (await readStore<DiscoveryCard>(page, "discoveries"))[0]?.notes).toBe("First time through.");
  const [first] = await readStore<DiscoveryCard>(page, "discoveries");

  // The overview says it's finished; studying it again starts the steps fresh (after confirming).
  await page.goto(`/investigate/${ID}`);
  await expect(page.getByRole("region", { name: "Completed" })).toContainText("You completed this investigation on");
  await page.getByRole("button", { name: "Study it again" }).click();
  const dialog = page.getByRole("dialog", { name: "Study it again?" });
  await expect(dialog).toContainText("Your Discovery Card stays in your Notebook, and finishing again updates it.");
  await dialog.getByRole("button", { name: "Study it again" }).click();
  await expect(stepArticle(page, quick[0])).toBeVisible();
  await expect(stepStatus(page, 0)).toHaveAccessibleName(/not started|in progress/);
  for (const [index, step] of quick.entries()) await solveStep(page, step, "easy", { next: index < quick.length - 1 });
  await page.getByRole("button", { name: "See your discovery" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved to your Notebook." })).toBeVisible();
  const cards = await readStore<DiscoveryCard>(page, "discoveries");
  expect(cards).toHaveLength(1);
  expect(cards[0]).toMatchObject({ id: first.id, createdAt: first.createdAt, notes: "First time through." });
  expect(Date.parse(cards[0].updatedAt)).toBeGreaterThan(Date.parse(first.updatedAt));

  // Delete the card in the Notebook: the investigation stays finished, and its discovery can be saved again.
  await page.goto(`/notebook?card=${first.id}`);
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog", { name: "Delete this discovery?" }).getByRole("button", { name: "Delete discovery" }).click();
  await expect(page).toHaveURL("/notebook");
  await page.goto(`/investigate/${ID}`);
  await page.getByRole("button", { name: "Review your discovery" }).click();
  await expect(page.getByText("This discovery isn’t in your Notebook right now. It may have been removed there.")).toBeVisible();
  await page.getByRole("button", { name: "Save to Notebook" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved to your Notebook." })).toBeVisible();
  const [saved] = await readStore<DiscoveryCard>(page, "discoveries");
  expect(saved.title).toBe(done.title);
  await page.getByRole("link", { name: "Open in Notebook" }).click();
  await expect(page.getByRole("heading", { level: 1, name: done.title })).toBeVisible();
});

test("progress saved by a newer version of the investigation is shown read-only and never saved over", async ({ page }) => {
  await page.goto(`/investigate/${ID}`);
  await expect(page.getByRole("button", { name: "Begin the investigation" })).toBeVisible();
  const at = new Date().toISOString();
  const state = (status: "started" | "complete") => ({ status, difficulty: "medium", attempts: 1, hintsShown: 0, revealed: false, skipped: false, updatedAt: at });
  // As a newer build would save it: a step and a side question this build doesn't have, and an answer in progress.
  const newer = {
    id: ID,
    dataVersion: STUDY_DATA_VERSION,
    contentVersion: inv.contentVersion + 1,
    startedAt: at,
    updatedAt: at,
    difficulty: "medium",
    length: "deep",
    position: { stepId: "added-later" },
    steps: {
      [whoDidSin.id]: { ...state("complete"), completedAt: at },
      [hardThings.id]: { ...state("started"), response: { from: "a newer version" } },
      "added-later": state("started"),
    },
    visitedBranches: ["added-later-branch"],
  };
  await putRaw(page, "studyProgress", [newer]);
  await page.reload();

  const setup = page.getByRole("region", { name: "Your progress" });
  await expect(setup.getByRole("alert")).toContainText("This investigation was saved by a newer version of Gospel Labs. Reload to update before continuing.");
  await expect(setup.getByRole("button", { name: "Reload" })).toBeVisible();
  for (const name of [/^Resume/, /^Begin/, /^Start over/, /^Study it again/, /^Study without saving/, /^Look through the steps/]) {
    await expect(page.getByRole("button", { name })).toHaveCount(0);
  }
  await expect(page.getByText("This investigation was updated since you last studied it.")).toHaveCount(0);

  // Leaving the page (which saves anything pending) leaves it exactly as the newer version saved it.
  await page.goto("/investigate");
  expect(await readStore(page, "studyProgress")).toEqual([newer]);
});

test("progress that can't be read is never replaced: the investigation can only be studied without saving", async ({ page }) => {
  await page.goto(`/investigate/${ID}`);
  await expect(page.getByRole("button", { name: "Begin the investigation" })).toBeVisible();
  const at = new Date().toISOString();
  // A finished investigation with one damaged field: this version can't read it, but it holds the learner's work.
  const damaged = {
    id: ID,
    dataVersion: STUDY_DATA_VERSION,
    contentVersion: inv.contentVersion,
    startedAt: at,
    updatedAt: at,
    completedAt: at,
    discoveryId: "card-kept",
    difficulty: "impossible",
    length: "quick",
    position: { stepId: whoDidSin.id },
    steps: {},
    visitedBranches: [],
  };
  await putRaw(page, "studyProgress", [damaged]);
  await page.reload();

  const setup = page.getByRole("region", { name: "How would you like to study?" });
  await expect(setup.getByRole("alert")).toContainText("Your saved progress couldn’t be loaded.");
  await expect(setup.getByRole("button", { name: "Reload" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Begin the investigation" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Resume/ })).toHaveCount(0);
  await chooseStudySettings(page, { difficulty: "medium", length: "quick" });
  await page.getByRole("button", { name: "Study without saving" }).click();

  // The study works for this visit, and says it isn't being saved.
  await expect(page.getByRole("alert").filter({ hasText: "Your progress isn’t being saved." })).toBeVisible();
  await solveStep(page, whoDidSin, "medium");
  await expect(stepArticle(page, quick[1])).toBeVisible();
  await page.goto("/investigate");
  expect(await readStore(page, "studyProgress")).toEqual([damaged]);
});

test("a completion made in another tab isn't undone here, and finishing here too updates the same Discovery Card", async ({ page, context }) => {
  await startInvestigation(page, ID, { difficulty: "easy", length: "quick" });
  await expectStored<StudyProgress>(page, "studyProgress", (records) => records.length === 1);

  // Another tab picks the investigation up and finishes it.
  const other = await context.newPage();
  await other.goto(`/investigate/${ID}`);
  await other.getByRole("region", { name: "Continue" }).getByRole("button", { name: "Resume", exact: true }).click();
  for (const [index, step] of quick.entries()) await solveStep(other, step, "easy", { next: index < quick.length - 1 });
  await other.getByRole("button", { name: "See your discovery" }).click();
  await expect(other.getByRole("status").filter({ hasText: "Saved to your Notebook." })).toBeVisible();
  const [card] = await readStore<DiscoveryCard>(other, "discoveries");
  await other.close();

  // This tab, still on step 1, carries on: its saves keep the other tab's completion and card link.
  await solveStep(page, quick[0], "easy");
  await expectStored<StudyProgress>(page, "studyProgress", ([record]) => record?.position.stepId === quick[1].id);
  const [record] = await readStore<StudyProgress>(page, "studyProgress");
  expect(record.discoveryId).toBe(card.id);
  expect(record.completedAt).toBeTruthy();

  // Finishing here updates that same card rather than making a second one.
  const rest = quick.slice(1);
  for (const [index, step] of rest.entries()) await solveStep(page, step, "easy", { next: index < rest.length - 1 });
  await page.getByRole("button", { name: "See your discovery" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved to your Notebook." })).toBeVisible();
  const cards = await readStore<DiscoveryCard>(page, "discoveries");
  expect(cards).toHaveLength(1);
  expect(cards[0]).toMatchObject({ id: card.id, createdAt: card.createdAt });
  expect((await readStore<StudyProgress>(page, "studyProgress"))[0].discoveryId).toBe(card.id);
});
