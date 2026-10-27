"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { ProvenanceLabel } from "@/components/study/shared/provenance";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Select, Textarea } from "@/components/ui/input";
import type { DiscoveryGraph } from "@/domain/study/graph";
import type { PersonalConnection } from "@/domain/study/user-data";
import { RELATION_LABELS, RELATION_PHRASES, RELATIONS, type NodeRef, type Relation } from "@/domain/study/vocabulary";
import { createId } from "@/lib/ids";
import { getStudyRepository } from "@/persistence/client";
import { toStorageError } from "@/persistence/storage-errors";
import { NodePicker } from "./node-picker";

export type ConnectionEditor = { mode: "create"; from: NodeRef | null } | { mode: "edit"; connection: PersonalConnection };

interface ConnectionDialogProps {
  graph: DiscoveryGraph;
  editor: ConnectionEditor | null;
  onClose: () => void;
  onSaved: (connection: PersonalConnection, created: boolean) => void;
}

/**
 * Adds or edits a connection the learner makes on their Map, between any
 * two nodes already on it. The note — why they see the connection, in their
 * own words — is required, and the connection is always labeled "Your interpretation".
 * Remount with a new `key` for each opening.
 */
export function ConnectionDialog({ graph, editor, onClose, onSaved }: ConnectionDialogProps) {
  const editing = editor?.mode === "edit" ? editor.connection : null;
  const [from, setFrom] = useState<NodeRef | null>(editing?.from.ref ?? (editor?.mode === "create" ? editor.from : null));
  const [to, setTo] = useState<NodeRef | null>(editing?.to.ref ?? null);
  const [relation, setRelation] = useState<Relation>(editing?.relation ?? "relates-to");
  const [note, setNote] = useState(editing?.note ?? "");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = (ref: NodeRef | null) => {
    if (!ref) return "";
    const saved = editing ? (editing.from.ref === ref ? editing.from.label : editing.to.label) : undefined;
    return graph.nodeByRef.get(ref)?.label ?? saved ?? ref;
  };
  const errors = {
    from: !from ? "Choose where the connection starts." : undefined,
    to: !to ? "Choose what it connects to." : from === to ? "Choose two different things." : undefined,
    note: note.trim() ? undefined : "Write a few words about why you see this connection.",
  };
  const valid = !errors.from && !errors.to && !errors.note;

  const save = async () => {
    setSubmitted(true);
    if (!valid || !from || !to) return;
    setBusy(true);
    setError(null);
    const now = new Date().toISOString();
    const record: PersonalConnection = editing
      ? { ...editing, relation, note: note.trim(), updatedAt: now }
      : {
          id: createId(),
          createdAt: now,
          updatedAt: now,
          from: { ref: from, label: label(from) },
          to: { ref: to, label: label(to) },
          relation,
          note: note.trim(),
          sourceIds: [],
        };
    try {
      const saved = await getStudyRepository().personalConnections.put(record);
      onSaved(saved, !editing);
    } catch (cause) {
      setError(toStorageError(cause).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={editor !== null}
      onClose={onClose}
      title={editing ? "Edit your connection" : "Connect two things on your Map"}
      description={
        <>
          Connections you add are your own interpretation, and are labeled that way on your Map. Explain in your own words
          why you see them as connected.
        </>
      }
      className="max-w-xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? "Saving…" : editing ? "Save changes" : "Add connection"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5 pb-1">
        {editing ? (
          <p className="rounded-lg border border-line bg-surface-sunken/50 px-3.5 py-3 text-sm leading-relaxed text-fg">
            <span className="font-medium">{label(from)}</span>
            <ArrowRight aria-label="to" className="mx-1.5 inline size-4 text-subtle" />
            <span className="font-medium">{label(to)}</span>
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <NodePicker
              legend="From"
              nodes={graph.nodes}
              value={from}
              onChange={setFrom}
              exclude={to}
              error={submitted ? errors.from : undefined}
            />
            <NodePicker legend="To" nodes={graph.nodes} value={to} onChange={setTo} exclude={from} error={submitted ? errors.to : undefined} />
          </div>
        )}

        <Field label="How they relate">
          {(props) => (
            <Select {...props} className="h-11" value={relation} onChange={(event) => setRelation(event.target.value as Relation)}>
              {RELATIONS.map((value) => (
                <option key={value} value={value}>
                  {RELATION_LABELS[value]}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field
          label="Why you see this connection"
          hint="In your own words. Only you see it, on this device."
          error={submitted ? errors.note : undefined}
        >
          {(props) => (
            <Textarea
              {...props}
              rows={3}
              data-autofocus={editing ? true : undefined}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="For example: both show the Savior reaching out before being asked."
            />
          )}
        </Field>

        {from && to && from !== to && (
          <div className="flex flex-col gap-1.5 rounded-lg border border-accent/30 bg-accent-soft/50 px-3.5 py-3">
            <ProvenanceLabel provenance="user" />
            <p className="text-sm leading-relaxed text-fg">
              <span className="font-medium">{label(from)}</span> {RELATION_PHRASES[relation]} <span className="font-medium">{label(to)}</span>
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
