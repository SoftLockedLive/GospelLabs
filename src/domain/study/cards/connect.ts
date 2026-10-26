/**
 * Discovery Card for a Connect with Christ session. Created only when the
 * learner chooses "Save this scripture to my Notebook", never automatically.
 * The card keeps the session's scripture (so the Map shows it as a scripture
 * node) and, if the learner chooses, their private note. It records no
 * concepts, connections, or anything about how the session went.
 */
import type { ConnectSession, Source } from "../content-schema";
import type { DiscoveryCard } from "../user-data";
import { snapshotSource } from "./common";

interface ConnectCardInput {
  session: Pick<ConnectSession, "id" | "title" | "question">;
  /** The session's scripture (its `sourceId`). */
  source: Source;
  /** The learner's note, if they chose to include it. */
  note?: string;
  /** A new random id (createId()). */
  id: string;
  now: Date;
}

export function connectDiscoveryCard({ session, source, note, id, now }: ConnectCardInput): DiscoveryCard {
  const at = now.toISOString();
  return {
    id,
    createdAt: at,
    updatedAt: at,
    origin: { kind: "connect", contentId: session.id },
    title: session.title,
    ...(session.question ? { question: session.question } : {}),
    summary: "",
    sources: [snapshotSource(source)],
    concepts: [],
    connections: [],
    highlights: [],
    notes: note?.trim() ?? "",
  };
}

/** The card already saved from this session, if any (the most recently updated one). */
export function findConnectCard<T extends Pick<DiscoveryCard, "origin" | "updatedAt">>(cards: readonly T[], sessionId: string): T | undefined {
  return cards
    .filter((card) => card.origin.kind === "connect" && card.origin.contentId === sessionId)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
}

/** An existing card with the learner's latest note. Everything else stays as it was saved. */
export function withConnectNote(card: DiscoveryCard, note: string, now: Date): DiscoveryCard {
  return { ...card, notes: note.trim(), updatedAt: now.toISOString() };
}
