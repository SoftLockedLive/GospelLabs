/**
 * Connect with Christ: a quiet five minutes. A session opens at once; the
 * learner can choose a format or ask for a different session; a private note
 * stays on this device; saving to the Notebook is optional. Nothing is
 * counted, timed, or tracked as a streak.
 */
import { expect, test, type Page } from "@playwright/test";
import { CONNECT_FORMAT_LABELS } from "@/domain/study/content-schema";
import type { DiscoveryCard, Exploration } from "@/domain/study/user-data";
import { getSource, listConnectSessions } from "@/lib/study-content";
import { expectNoScoring, expectStored, pick, readStore } from "./study-helpers";
import { putStoredRecord } from "./study-raw-storage";

const sessions = listConnectSessions();
const session = (page: Page) => page.getByRole("main").getByRole("article");
const titleOf = async (page: Page) => (await session(page).getByRole("heading", { level: 2 }).innerText()).trim();
const formats = (page: Page) => page.getByRole("group", { name: "Choose a way to spend these minutes" });

/** Walks to the end of a session: Continue until the note appears. */
async function readToTheEnd(page: Page) {
  const note = page.getByRole("textbox", { name: /A private note/ });
  for (let i = 0; i < 3 && !(await note.isVisible()); i++) {
    await session(page).getByRole("button", { name: "Continue", exact: true }).click();
  }
  await expect(note).toBeVisible();
}

/** No counters, timers, streaks, or progress meters anywhere on the page. */
async function expectNothingCounted(page: Page) {
  await expect(page.getByRole("timer")).toHaveCount(0);
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await expect(page.getByRole("meter")).toHaveCount(0);
  const text = await page.getByRole("main").innerText();
  // A count of sessions, time left, or a streak. (A ticking clock would also change the text, which the caller checks.)
  expect(text).not.toMatch(/\b\d+\s+sessions?\b|\bin a row\b|\b(sessions?|minutes?|seconds?)\s+(left|remaining)\b/i);
  await expectNoScoring(page);
}

test("a session opens at once; formats can be switched and another session shown; nothing is counted or timed", async ({ page }) => {
  await page.goto("/connect");
  await expect(page.getByRole("heading", { level: 1, name: "Connect with Christ" })).toBeVisible();
  await expect(page.getByText("There’s no timer.")).toBeVisible();
  await expect(session(page)).toBeVisible();
  const first = await titleOf(page);
  expect(sessions.map((s) => s.title)).toContain(first);

  // Choose "See Christ": a See session appears.
  await pick(formats(page).getByRole("radio", { name: /^See Christ/ }));
  await expect(session(page).getByText(CONNECT_FORMAT_LABELS.see, { exact: true })).toBeVisible();
  const seeTitle = await titleOf(page);
  expect(sessions.filter((s) => s.format === "see").map((s) => s.title)).toContain(seeTitle);

  // "Show me a different one" changes the session.
  await page.getByRole("button", { name: "Show me a different one" }).first().click();
  await expect(session(page).getByRole("heading", { level: 2 })).not.toHaveText(seeTitle);
  expect(sessions.map((s) => s.title)).toContain(await titleOf(page));

  // Walk through to the end, with the optional pause: still nothing counted, and nothing changes while waiting.
  await readToTheEnd(page);
  await page.getByRole("button", { name: "Take a moment" }).click();
  await expect(page.getByRole("group", { name: "A quiet moment" })).toBeFocused();
  const before = await page.getByRole("main").innerText();
  await page.waitForTimeout(2_000);
  expect(await page.getByRole("main").innerText()).toBe(before);
  await page.getByRole("button", { name: "Continue when you’re ready" }).click();
  await expectNothingCounted(page);

  // The only thing recorded is which sessions were opened (for rotation): no durations or counts.
  const explorations = await readStore<Exploration>(page, "explorations");
  expect(explorations.length).toBeGreaterThanOrEqual(2);
  for (const record of explorations) {
    expect(record.kind).toBe("connect");
    expect(JSON.stringify(record)).not.toMatch(/duration|seconds|streak|count/i);
  }
});

test("a private note stays on this device, and saving to the Notebook is optional", async ({ page }) => {
  const chosen = sessions.find((s) => s.format === "reflect") ?? sessions[0];
  const source = getSource(chosen.sourceId)!;
  await page.goto(`/connect?session=${chosen.id}`);
  await expect(session(page).getByRole("heading", { level: 2 })).toHaveText(chosen.title);
  await readToTheEnd(page);

  const note = page.getByRole("textbox", { name: /A private note/ });
  await note.fill("He invites me to come as I am.");
  await expect(page.getByText("Saved on this device.")).toBeVisible();
  // Nothing went to the Notebook on its own.
  expect(await readStore(page, "discoveries")).toEqual([]);

  await page.goto(`/connect?session=${chosen.id}`);
  await readToTheEnd(page);
  await expect(note).toHaveValue("He invites me to come as I am.");

  // Optional: keep the scripture, with the note, in the Notebook.
  const include = page.getByRole("checkbox", { name: "Include my note" });
  await expect(include).toBeChecked();
  await page.getByRole("button", { name: "Save this scripture to my Notebook" }).click();
  await expect(page.getByText(`${source.label} is in your Notebook.`)).toBeVisible();
  const [card] = await readStore<DiscoveryCard>(page, "discoveries");
  expect(card).toMatchObject({ origin: { kind: "connect", contentId: chosen.id }, notes: "He invites me to come as I am." });

  await page.getByRole("link", { name: "Open it" }).click();
  await expect(page.getByRole("heading", { level: 1, name: card.title })).toBeVisible();
  await expect(page.getByRole("textbox", { name: /Your notes/ })).toHaveValue("He invites me to come as I am.");
  await expect(page.getByRole("complementary", { name: "Sources explored" })).toContainText(source.label);
});

const storedSession = async (page: Page, id: string) => (await readStore<Exploration>(page, "explorations")).find((record) => record.id === id);

test("a note typed just before leaving is saved, and opening the session again isn't counted as an edit", async ({ page }) => {
  const chosen = sessions.find((s) => s.format === "see") ?? sessions[0];
  const id = `connect:${chosen.id}`;
  await page.goto(`/connect?session=${chosen.id}`);
  await readToTheEnd(page);
  await page.getByRole("textbox", { name: /A private note/ }).fill("Seen, and not hurried.");
  // Leave at once, before the pause in typing that would save it.
  await page.getByRole("link", { name: "Close and return to the Dashboard" }).click();
  await expect(page).toHaveURL("/");
  await expectStored<Exploration>(page, "explorations", (records) => records.some((r) => r.id === id && r.note === "Seen, and not hurried."));
  const written = (await storedSession(page, id))!;

  await page.goto(`/connect?session=${chosen.id}`);
  await expect(session(page).getByRole("heading", { level: 2 })).toHaveText(chosen.title);
  await expect.poll(async () => (await storedSession(page, id))?.lastOpenedAt ?? "").not.toBe(written.lastOpenedAt ?? "");
  // A backup merge keeps the more recently updated copy, so opening must not make this copy look newer than its note.
  expect(await storedSession(page, id)).toMatchObject({ firstAt: written.firstAt, updatedAt: written.updatedAt, note: "Seen, and not hurried." });
  await readToTheEnd(page);
  await expect(page.getByRole("textbox", { name: /A private note/ })).toHaveValue("Seen, and not hurried.");
});

test("a note is never saved over a session record that can't be read", async ({ page }) => {
  const chosen = sessions.find((s) => s.format === "reflect") ?? sessions[0];
  const id = `connect:${chosen.id}`;
  await page.goto(`/connect?session=${chosen.id}`);
  await expectStored<Exploration>(page, "explorations", (records) => records.some((r) => r.id === id));
  const damaged = {
    id,
    kind: "connect",
    contentId: chosen.id,
    firstAt: "not a date",
    updatedAt: "2026-10-20T10:00:00.000Z",
    completedActivities: [],
    vocabulary: [],
    highlights: [],
    note: "A note to keep",
  };
  await putStoredRecord(page, "explorations", damaged);
  await page.reload();
  await readToTheEnd(page);

  const note = page.getByRole("textbox", { name: /A private note/ });
  await note.fill("A new thought");
  await note.blur();
  await expect(page.getByText(/Your note couldn’t be saved\. Some saved study data couldn’t be read/)).toBeVisible();
  await expect(note).toHaveValue("A new thought");
  expect(await storedSession(page, id)).toEqual(damaged);
});
