/**
 * The Discovery Notebook and the Discovery Map read the same Discovery Cards,
 * so they must always agree. A card from a finished investigation (one step
 * shown with "Show me", the rest worked out) appears in the Notebook with its
 * sources, concepts, connections, and labeled summary; notes autosave; the
 * Map shows the same concepts and connections (checked in the List view);
 * personal connections are created, edited, and deleted as "Your
 * interpretation"; and deleting a card removes the Map nodes only it supported.
 */
import { expect, test, type Page } from "@playwright/test";
import type { CheckedActivity } from "@/domain/study/content-schema";
import { buildDiscoveryGraph } from "@/domain/study/graph";
import type { DiscoveryCard, PersonalConnection } from "@/domain/study/user-data";
import { RELATION_LABELS, RELATION_PHRASES, type NodeRef } from "@/domain/study/vocabulary";
import {
  activityAt,
  activitySection,
  expectNoScoring,
  investigation,
  pathSteps,
  pick,
  readStore,
  solveStep,
  startInvestigation,
  startsWith,
  stepArticle,
  threeWrongTries,
} from "./study-helpers";
import { deleteStoredRecord } from "./study-raw-storage";

const ID = "when-faithful-people-suffer";
const inv = investigation(ID);
const steps = pathSteps(inv, "quick");
const PASSAGE = "he-will-take-upon-him";

/** Finishes the investigation (quick, medium), choosing "Show me" on the first step. Resolves on the completion view. */
async function finishWithOneStepShown(page: Page) {
  await startInvestigation(page, ID, { difficulty: "medium", length: "quick" });
  const first = activityAt(steps[0], "medium") as CheckedActivity;
  const section = activitySection(stepArticle(page, steps[0]), first);
  await threeWrongTries(page, section, first);
  await section.getByRole("button", { name: "Show me" }).click();
  await stepArticle(page, steps[0]).getByRole("button", { name: "Next step" }).click();
  for (const [index, step] of steps.slice(1).entries()) await solveStep(page, step, "medium", { next: index < steps.length - 2 });
  await page.getByRole("button", { name: "See your discovery" }).click();
  await expect(page.getByText("Saved to your Notebook.")).toBeVisible();
  const [card] = await readStore<DiscoveryCard>(page, "discoveries");
  return card;
}

/** Saves the Scripture Explorer passage as its own card (nothing highlighted). */
async function savePassage(page: Page) {
  await page.goto(`/explore/${PASSAGE}`);
  const save = page.getByRole("region", { name: "Save to Notebook" });
  await save.getByRole("button", { name: "Save to Notebook" }).click();
  await expect(save.getByText("Saved to your Notebook.")).toBeVisible();
}

const sentence = (connection: Pick<DiscoveryCard["connections"][number], "from" | "to" | "relation">) =>
  `${connection.from.label} ${RELATION_PHRASES[connection.relation]} ${connection.to.label}`;

async function openListView(page: Page) {
  await pick(page.getByRole("group", { name: "View as" }).getByRole("radio", { name: "List view" }));
}

/** Every node label shown in the Map's List view. */
const listedNodes = (page: Page) => page.getByRole("main").getByRole("heading", { level: 3 });

/** The node labels the Map should show for what's stored, computed with the app's own graph builder. */
async function expectedNodeLabels(page: Page) {
  const cards = await readStore<DiscoveryCard>(page, "discoveries");
  const connections = await readStore<PersonalConnection>(page, "personalConnections");
  return buildDiscoveryGraph(cards, connections).nodes.map((node) => node.label);
}

const nodeItem = (page: Page, label: string) =>
  page.getByRole("listitem").filter({ has: page.getByRole("heading", { level: 3, name: label, exact: true }) });

test("a finished investigation's card shows its sources, concepts, connections, and labeled summary in the Notebook", async ({ page }) => {
  const card = await finishWithOneStepShown(page);

  // The completion view opens with a short card: the big idea and the concepts, each labeled with who established it.
  await expect(page.getByText("You finished the investigation!")).toBeVisible();
  const bigIdea = page.getByRole("region", { name: "The big idea" });
  await expect(bigIdea).toContainText(inv.discovery.keyIdeas[0]);
  await expect(bigIdea).toContainText("Suggested by Gospel Labs");
  const workedOut = card.concepts.filter((c) => c.demonstrated);
  const wasShown = card.concepts.filter((c) => !c.demonstrated);
  await expect(page.getByRole("list", { name: "Concepts you discovered" }).getByRole("listitem")).toHaveText(workedOut.map((c) => c.label));
  if (wasShown.length) await expect(page.getByRole("list", { name: "Concepts shown along the way" }).getByRole("listitem")).toHaveText(wasShown.map((c) => c.label));
  // The rest waits under one disclosure; the note and the way on don't.
  const fullSummary = page.getByRole("region", { name: "What the evidence shows" });
  await expect(fullSummary).toBeHidden();
  await expect(page.getByRole("textbox", { name: /Your note/ })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Where to next" }).getByRole("link", { name: "Open your Map" })).toBeVisible();
  await page.getByText("See everything you found").click();
  await expect(fullSummary).toContainText(inv.discovery.summary);
  await expect(page.getByRole("region", { name: "Shown along the way" })).toContainText("Suggested by Gospel Labs");
  await expectNoScoring(page);

  await page.getByRole("link", { name: "Open in Notebook" }).click();
  await expect(page).toHaveURL(`/notebook?card=${card.id}`);
  const detail = page.getByRole("article", { name: inv.title });
  await expect(detail.getByRole("heading", { level: 1, name: inv.title })).toBeFocused();
  await expect(detail.getByRole("region", { name: "The question" })).toContainText(inv.question);
  await expect(detail.getByText("Studied at Medium difficulty")).toBeVisible();

  // The summary is labeled as Gospel Labs' suggestion, not doctrine or the learner's own words.
  const summary = detail.getByRole("region", { name: "What this discovery shows" });
  await expect(summary).toContainText(inv.discovery.summary);
  await expect(summary).toContainText("Suggested by Gospel Labs");

  // Concepts: worked out vs shown, exactly as stored.
  const concepts = detail.getByRole("region", { name: "Concepts" });
  const discovered = card.concepts.filter((c) => c.demonstrated);
  const shown = card.concepts.filter((c) => !c.demonstrated);
  expect(discovered.length).toBeGreaterThan(0);
  for (const concept of card.concepts) await expect(concepts.getByText(concept.label, { exact: true })).toBeVisible();
  await expect(concepts.getByText("You discovered")).toBeVisible();
  if (shown.length) await expect(concepts.getByText("Suggested by Gospel Labs")).toBeVisible();

  // Connections, each with who established it.
  const connections = detail.getByRole("region", { name: "Connections" }).getByRole("article");
  await expect(connections).toHaveCount(card.connections.length);
  for (const connection of card.connections) {
    const item = connections.filter({ hasText: sentence(connection) }).first();
    await expect(item).toContainText(connection.provenance === "demonstrated" ? "You discovered" : "Suggested by Gospel Labs");
  }
  expect(card.connections.some((c) => c.provenance === "suggested")).toBe(true);
  expect(card.connections.some((c) => c.provenance === "demonstrated")).toBe(true);

  // Every source studied, with its kind.
  const sources = detail.getByRole("complementary", { name: "Sources explored" }).getByRole("listitem");
  await expect(sources).toHaveCount(card.sources.length);
  for (const source of card.sources) await expect(sources.filter({ hasText: source.label }).first()).toBeVisible();
  await expectNoScoring(page);

  // The card is in the Notebook's list, and search finds it.
  await detail.getByRole("link", { name: "Discovery Notebook" }).click();
  await page.getByRole("searchbox", { name: "Search discoveries" }).fill(card.concepts[0].label);
  await expect(page.getByRole("article").filter({ hasText: inv.title })).toBeVisible();
  await page.getByRole("searchbox", { name: "Search discoveries" }).fill("no such discovery anywhere");
  await expect(page.getByRole("article").filter({ hasText: inv.title })).toHaveCount(0);
});

test("notes on a Discovery Card save automatically and persist", async ({ page }) => {
  const card = await finishWithOneStepShown(page);
  await page.goto(`/notebook?card=${card.id}`);
  const notes = page.getByRole("textbox", { name: /Your notes/ });
  await notes.fill("Luke 13 and John 9 say the same thing twice: not worse sinners.");
  await expect(page.getByRole("region", { name: "Notes" }).getByText("Saved", { exact: true })).toBeVisible();
  await page.reload();
  await expect(notes).toHaveValue("Luke 13 and John 9 say the same thing twice: not worse sinners.");
  const [stored] = await readStore<DiscoveryCard>(page, "discoveries");
  expect(stored.notes).toBe("Luke 13 and John 9 say the same thing twice: not worse sinners.");
  // The completion view shows the same note (it's one card).
  await page.goto(`/investigate/${ID}`);
  await page.getByRole("button", { name: "Review your discovery" }).click();
  await expect(page.getByRole("textbox", { name: /Your note/ })).toHaveValue("Luke 13 and John 9 say the same thing twice: not worse sinners.");
});

test("the Map shows the card's concepts and connections, and See on your Map opens its node", async ({ page }) => {
  const card = await finishWithOneStepShown(page);
  await page.goto(`/notebook?card=${card.id}`);
  // Each concept links to its own node on the Map.
  const concept = card.concepts[0];
  await expect(page.getByRole("link", { name: `${concept.label}: see on Map` })).toHaveAttribute("href", `/map?node=${encodeURIComponent(concept.ref)}`);
  await page.getByRole("link", { name: "See on Map", exact: true }).click();
  await expect(page).toHaveURL(`/map?node=${encodeURIComponent(`investigation:${ID}`)}`);
  // The details panel opens on the investigation itself, linked back to the card.
  const panel = page.getByRole("complementary", { name: inv.title });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("link", { name: startsWith(inv.title) }).first()).toHaveAttribute("href", `/notebook?card=${card.id}`);
  // Every control in the details can be reached, including the last one when it's a bottom sheet above the phone's tab bar.
  const controls = panel.locator("a, button");
  await controls.last().scrollIntoViewIfNeeded();
  await controls.last().click({ trial: true, timeout: 5_000 });
  await panel.getByRole("button", { name: "Close details" }).click();

  await openListView(page);
  // Exactly the nodes the stored cards support: each concept, each connection end, the investigation, and its primary question.
  const expected = await expectedNodeLabels(page);
  await expect(listedNodes(page)).toHaveText(expected.map((label) => new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`)), { useInnerText: true });
  for (const concept of card.concepts) await expect(nodeItem(page, concept.label)).toHaveCount(1);
  expect(expected).toContain(inv.title);

  // Every card connection reads the same way on the Map, with its provenance.
  for (const connection of card.connections) {
    const edges = page.getByRole("list", { name: `Connections of ${connection.from.label}` }).getByRole("listitem");
    const edge = edges.filter({ hasText: sentence(connection) }).first();
    await expect(edge).toContainText(connection.provenance === "demonstrated" ? "You discovered" : "Suggested by Gospel Labs");
  }
});

test("a personal connection can be created, edited, and deleted, and is labeled Your interpretation", async ({ page }) => {
  const card = await finishWithOneStepShown(page);
  const [from, to] = [card.concepts[0], card.concepts[1]];
  await page.goto("/map");
  await openListView(page);

  await page.getByRole("button", { name: "Add a connection" }).click();
  const dialog = page.getByRole("dialog", { name: "Connect two things on your Map" });
  await expect(dialog).toContainText("Connections you add are your own interpretation");
  // Nothing chosen and no note: each problem is named.
  await dialog.getByRole("button", { name: "Add connection" }).click();
  await expect(dialog.getByText("Choose where the connection starts.")).toBeVisible();
  await expect(dialog.getByText("Choose what it connects to.")).toBeVisible();
  await expect(dialog.getByText("Write a few words about why you see this connection.")).toBeVisible();

  const choose = async (legend: "From" | "To", label: string) => {
    const group = dialog.getByRole("group", { name: legend });
    await group.getByRole("searchbox", { name: `Search: ${legend}` }).fill(label);
    await group.getByRole("radio", { name: new RegExp(`^${label}( |$)`) }).check();
  };
  await choose("From", from.label);
  await choose("To", to.label);
  await dialog.getByRole("combobox", { name: "How they relate" }).selectOption({ label: RELATION_LABELS["leads-to"] });
  await dialog.getByRole("textbox", { name: /Why you see this connection/ }).fill("Seeing one helps me trust the other.");
  await expect(dialog.getByText("Your interpretation")).toBeVisible();
  await expect(dialog).toContainText(`${from.label} ${RELATION_PHRASES["leads-to"]} ${to.label}`);
  await dialog.getByRole("button", { name: "Add connection" }).click();
  await expect(dialog).toBeHidden();

  // It's on the Map in words, labeled as the learner's own, and stored with its note.
  const ownEdge = page
    .getByRole("list", { name: `Connections of ${from.label}` })
    .getByRole("listitem")
    .filter({ hasText: `${from.label} ${RELATION_PHRASES["leads-to"]} ${to.label}` });
  await expect(ownEdge).toContainText("Your interpretation");
  const [stored] = await readStore<PersonalConnection>(page, "personalConnections");
  expect(stored).toMatchObject({ from: { ref: from.ref }, to: { ref: to.ref }, relation: "leads-to", note: "Seeing one helps me trust the other." });

  // Edit it from the node's details: the note changes, the ends don't.
  const panel = page.getByRole("complementary", { name: from.label });
  await expect(panel).toBeVisible();
  const own = panel.getByRole("article").filter({ hasText: "Your interpretation" });
  await expect(own).toContainText("Seeing one helps me trust the other.");
  await own.getByRole("button", { name: "Edit" }).click();
  const edit = page.getByRole("dialog", { name: "Edit your connection" });
  await expect(edit).toContainText(`${from.label}`);
  await edit.getByRole("textbox", { name: /Why you see this connection/ }).fill("Each one points me to the other.");
  await edit.getByRole("combobox", { name: "How they relate" }).selectOption({ label: RELATION_LABELS["supports"] });
  await edit.getByRole("button", { name: "Save changes" }).click();
  await expect(own).toContainText("Each one points me to the other.");
  await expect(own).toContainText(`${from.label} ${RELATION_PHRASES.supports} ${to.label}`);
  await page.reload();
  await expect(page.getByRole("complementary", { name: from.label }).getByRole("article").filter({ hasText: "Your interpretation" })).toContainText(
    "Each one points me to the other.",
  );

  // Delete it, confirming first.
  await page.getByRole("complementary", { name: from.label }).getByRole("article").filter({ hasText: "Your interpretation" }).getByRole("button", { name: "Delete" }).click();
  const confirm = page.getByRole("dialog", { name: "Delete your connection?" });
  await confirm.getByRole("button", { name: "Delete connection" }).click();
  await expect(confirm).toBeHidden();
  await expect(page.getByRole("complementary", { name: from.label }).getByText("Your interpretation")).toHaveCount(0);
  expect(await readStore(page, "personalConnections")).toEqual([]);
});

test("deleting a card removes the Map nodes only it supported, and keeps the learner's own connections", async ({ page }) => {
  const card = await finishWithOneStepShown(page);
  await savePassage(page);
  const cards = await readStore<DiscoveryCard>(page, "discoveries");
  const passageCard = cards.find((c) => c.origin.kind === "passage")!;
  const refsOf = (c: DiscoveryCard) => new Set<NodeRef>([...c.concepts.map((x) => x.ref), ...c.connections.flatMap((x) => [x.from.ref, x.to.ref])]);
  const passageRefs = refsOf(passageCard);
  const shared = card.concepts.filter((concept) => passageRefs.has(concept.ref));
  const onlyHere = card.concepts.filter((concept) => !passageRefs.has(concept.ref));
  // The two cards must overlap for this test to mean something.
  expect(shared.length).toBeGreaterThan(0);
  expect(onlyHere.length).toBeGreaterThan(1);

  // A connection of the learner's own, from a node only the investigation card supports.
  const [kept, ...gone] = onlyHere;
  await page.goto("/map");
  await openListView(page);
  await page.getByRole("button", { name: "Add a connection" }).click();
  const dialog = page.getByRole("dialog", { name: "Connect two things on your Map" });
  await dialog.getByRole("group", { name: "From" }).getByRole("searchbox").fill(kept.label);
  await dialog.getByRole("group", { name: "From" }).getByRole("radio", { name: new RegExp(`^${kept.label}( |$)`) }).check();
  await dialog.getByRole("group", { name: "To" }).getByRole("searchbox").fill(shared[0].label);
  await dialog.getByRole("group", { name: "To" }).getByRole("radio", { name: new RegExp(`^${shared[0].label}( |$)`) }).check();
  await dialog.getByRole("textbox", { name: /Why you see this connection/ }).fill("They belong together for me.");
  await dialog.getByRole("button", { name: "Add connection" }).click();
  await expect(dialog).toBeHidden();
  await expect(nodeItem(page, inv.title)).toHaveCount(1);

  // Delete the investigation's card from the Notebook.
  await page.goto(`/notebook?card=${card.id}`);
  await page.getByRole("button", { name: "Delete" }).click();
  const confirm = page.getByRole("dialog", { name: "Delete this discovery?" });
  await expect(confirm).toContainText("connections you made yourself on the Map are kept");
  await confirm.getByRole("button", { name: "Delete discovery" }).click();
  await expect(page).toHaveURL("/notebook");
  await expect(page.getByText(`Deleted “${inv.title}”`)).toBeAttached();
  expect((await readStore<DiscoveryCard>(page, "discoveries")).map((c) => c.id)).toEqual([passageCard.id]);

  await page.goto("/map");
  await openListView(page);
  // Nodes only the deleted card supported are gone; shared ones stay; the learner's connection keeps its end.
  await expect(nodeItem(page, inv.title)).toHaveCount(0);
  for (const concept of gone) await expect(nodeItem(page, concept.label)).toHaveCount(0);
  for (const concept of shared) await expect(nodeItem(page, concept.label)).toHaveCount(1);
  await expect(nodeItem(page, kept.label)).toContainText("From a connection you made");
  await expect(listedNodes(page)).toHaveCount((await expectedNodeLabels(page)).length);
});

test("a note typed on a card deleted elsewhere stays in the field, says it wasn't saved, and doesn't bring the card back", async ({ page }) => {
  await savePassage(page);
  const [card] = await readStore<DiscoveryCard>(page, "discoveries");
  await page.goto(`/notebook?card=${card.id}`);
  await expect(page.getByRole("heading", { level: 1, name: card.title })).toBeVisible();

  // Another tab (or another version of the app) deletes the card; this page hasn't heard yet.
  await deleteStoredRecord(page, "discoveries", card.id);
  const notes = page.getByRole("textbox", { name: /Your notes/ });
  await notes.fill("Written after it was deleted.");
  await expect(page.getByRole("alert").filter({ hasText: "This card was deleted, so your note wasn’t saved." })).toBeVisible();
  await expect(notes).toHaveValue("Written after it was deleted.");
  expect(await readStore(page, "discoveries")).toEqual([]);
});
