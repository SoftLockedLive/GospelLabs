import { describe, expect, it, vi } from "vitest";
import type { DiscoveryCard } from "@/domain/study/user-data";
import { createTestStudyRepository } from "@/persistence/study-test-utils";
import { hasUnsavedNotes, NotesAutosave, type NotesStatus } from "./card-notes-autosave";

const NOW = "2026-10-25T12:00:00.000Z";

const card: DiscoveryCard = {
  id: "card-1",
  createdAt: NOW,
  updatedAt: NOW,
  origin: { kind: "passage", contentId: "he-will-take-upon-him" },
  title: "He will take upon him",
  summary: "",
  sources: [],
  concepts: [],
  connections: [],
  highlights: [],
  notes: "",
};

/** `save`: the typing pause. Long by default, so only an explicit flush saves. */
function setup(save = 60_000) {
  const { db, study } = createTestStudyRepository();
  const statuses: NotesStatus[] = [];
  const autosave = new NotesAutosave(card.id, (status) => statuses.push(status), () => study, { save, retry: 60_000 });
  const last = () => statuses.at(-1);
  return { db, study, autosave, last };
}

describe("card notes autosave", () => {
  it("saves a moment after typing stops", async () => {
    const { study, autosave, last } = setup(5);
    await study.discoveries.put(card);
    autosave.change("Each one, by name.");
    expect(last()).toEqual({ state: "pending" });
    await vi.waitFor(() => expect(last()).toEqual({ state: "saved" }));
    expect((await study.discoveries.get(card.id))?.notes).toBe("Each one, by name.");
    expect(await autosave.flush()).toBe(true);
  });

  it("keeps the notes, and says so, when the card was deleted elsewhere, and never brings the card back", async () => {
    const { db, study, autosave, last } = setup();
    await study.discoveries.put(card);
    autosave.change("Typed after another tab deleted it");
    await study.deleteDiscovery(card.id);

    expect(await autosave.flush()).toBe(false);
    expect(last()).toEqual({ state: "deleted" });
    expect(hasUnsavedNotes(last()!)).toBe(true);
    expect(await db.discoveries.get(card.id)).toBeUndefined();
    // Still unsaved: the update notice's "save everything first" doesn't report success.
    expect(await autosave.flush()).toBe(false);
  });

  it("never overwrites a stored card it can't read, and reports why without retrying", async () => {
    const { db, autosave, last } = setup();
    const damaged = { ...card, title: "", notes: "The learner's earlier notes" };
    await db.discoveries.put(damaged);
    autosave.change("New notes");

    expect(await autosave.flush()).toBe(false);
    expect(last()).toMatchObject({ state: "error", retrying: false });
    expect(await db.discoveries.get(card.id)).toEqual(damaged);
    autosave.dispose();
  });

  it("reports a pending save as unsaved until it is stored", () => {
    expect(hasUnsavedNotes({ state: "idle" })).toBe(false);
    expect(hasUnsavedNotes({ state: "saved" })).toBe(false);
    expect(hasUnsavedNotes({ state: "pending" })).toBe(true);
    expect(hasUnsavedNotes({ state: "saving" })).toBe(true);
    expect(hasUnsavedNotes({ state: "error", message: "", retrying: true })).toBe(true);
  });
});
