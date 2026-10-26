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
