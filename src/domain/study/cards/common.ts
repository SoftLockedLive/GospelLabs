/**
 * Helpers shared by every Discovery Card builder (investigations, Scripture
 * Explorer passages, Character of Christ attributes). Cards snapshot labels
 * and citations so they stay readable even if content later changes.
 */
import type { ConnectionDef, Source } from "../content-schema";
import type { CardConnection, CardSource, LabeledNode } from "../user-data";
import type { NodeRef } from "../vocabulary";

export type LabelFor = (ref: NodeRef) => string;

export const snapshotSource = (source: Source): CardSource => ({
  id: source.id,
  label: source.label,
  kind: source.kind,
  url: source.url,
});

export const labeledNode = (ref: NodeRef, labelFor: LabelFor): LabeledNode => ({ ref, label: labelFor(ref) });

/** Deterministic id, so the same connection from the same content is recognized as one edge everywhere. */
export const connectionKey = (from: NodeRef, relation: string, to: NodeRef) => `${from}|${relation}|${to}`;

export function cardConnection(def: ConnectionDef, labelFor: LabelFor, provenance: CardConnection["provenance"]): CardConnection {
  return {
    id: connectionKey(def.from, def.relation, def.to),
    from: labeledNode(def.from, labelFor),
    to: labeledNode(def.to, labelFor),
    relation: def.relation,
    sourceIds: [...def.sourceIds],
    note: def.note,
    provenance,
  };
}

/** Removes duplicate connections by id; a demonstrated copy wins over a suggested one. */
export function dedupeConnections(connections: readonly CardConnection[]): CardConnection[] {
  const byId = new Map<string, CardConnection>();
  for (const connection of connections) {
    const existing = byId.get(connection.id);
    if (!existing || (existing.provenance === "suggested" && connection.provenance === "demonstrated")) byId.set(connection.id, connection);
  }
  return [...byId.values()];
}

/** Something the learner wrote elsewhere (a reflection, a private note) to keep in a card's notes. */
export interface LearnerWriting {
  /** Shown on the line above, e.g. the step it was written in. */
  heading?: string;
  text: string;
}

/**
 * The card's notes with the learner's other writing added, so their own words
 * stay with the card. Notes stay theirs: nothing is removed, writing already
 * there isn't repeated, and writing that grew since it was added (it starts
 * with a paragraph already in the notes) replaces that paragraph instead of
 * being added again. Anything else is added at the end.
 */
export function withLearnerWriting(notes: string, writing: readonly LearnerWriting[]): string {
  let result = notes;
  for (const { heading, text: raw } of writing) {
    const text = raw.trim();
    if (!text || result.includes(text)) continue;
    const entry = heading ? `${heading}\n${text}` : text;
    const paragraphs = result.split(/\n{2,}/);
    const grown = paragraphs.findIndex((paragraph) => {
      const body = (heading && paragraph.startsWith(`${heading}\n`) ? paragraph.slice(heading.length + 1) : paragraph)
        .trim()
        // "He knows." grows into "He knows, and…": the old ending punctuation isn't part of what continues.
        .replace(/[.!?…]+$/, "");
      return body.length >= 10 && text.startsWith(body);
    });
    if (grown >= 0) {
      paragraphs[grown] = entry;
      result = paragraphs.join("\n\n");
    } else result = result.trim() ? `${result.trimEnd()}\n\n${entry}` : entry;
  }
  return result;
}
