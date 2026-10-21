"use client";

import { Plus, Spline } from "lucide-react";
import { useRef } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import type { Investigation } from "@/domain/investigation";
import type { InvestigationActions } from "../use-investigation";
import { ConnectionForm } from "./connection-form";
import { ConnectionItem } from "./connection-item";

/** A request to show the new-connection form, optionally starting from one card. */
export interface ConnectionFormRequest {
  /** Changes on every request, so the form starts fresh. */
  key: number;
  fromEvidenceId?: string;
}

interface EvidenceConnectionsProps {
  investigation: Investigation;
  actions: InvestigationActions;
  labels: ReadonlyMap<string, string>;
  form: ConnectionFormRequest | null;
  onOpenForm: (fromEvidenceId?: string) => void;
  onCloseForm: () => void;
  /** Shows an evidence card from a connection. */
  onOpenEvidence: (evidenceId: string) => void;
}

/**
 * Connections between pieces of evidence, each made and explained by the
 * user. Gospel Labs never creates, suggests, or evaluates them.
 */
export function EvidenceConnections({
  investigation,
  actions,
  labels,
  form,
  onOpenForm,
  onCloseForm,
  onOpenEvidence,
}: EvidenceConnectionsProps) {
  const { evidence, evidenceConnections: connections } = investigation;
  const createRef = useRef<HTMLButtonElement>(null);
  const cards = new Map(evidence.map((card) => [card.id, card]));
  const possiblePairs = (evidence.length * (evidence.length - 1)) / 2;
  const allConnected = evidence.length >= 2 && connections.length >= possiblePairs;

  const close = (focusConnectionId?: string) => {
    flushSync(onCloseForm);
    const target = focusConnectionId ? document.getElementById(`connection-${focusConnectionId}`) : createRef.current;
    target?.focus();
  };

  return (
    <section aria-labelledby="connections-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id="connections-heading" className="flex items-center gap-2 text-sm font-semibold text-fg">
            <Spline aria-hidden className="size-4 text-accent" />
            Evidence connections
            {connections.length > 0 && <span className="font-normal text-subtle">({connections.length})</span>}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-subtle">
            Note how two pieces of evidence relate. Every connection is yours; Gospel Labs never makes or judges them.
          </p>
        </div>
        {evidence.length >= 2 && (
          <Button
            ref={createRef}
            variant="secondary"
            size="sm"
            disabled={allConnected || form !== null}
            onClick={() => onOpenForm()}
          >
            <Plus aria-hidden />
            Create connection
          </Button>
        )}
      </div>

      {evidence.length < 2 ? (
        <p className="rounded-lg border border-dashed border-line-strong px-4 py-3 text-sm leading-relaxed text-muted">
          {evidence.length === 0
            ? "Add at least two pieces of evidence, then connect them to note how they relate."
            : "Add one more piece of evidence to connect it with the first."}
        </p>
      ) : (
        <>
          {form && (
            <ConnectionForm
              key={form.key}
              investigation={investigation}
              labels={labels}
              initialFromId={form.fromEvidenceId}
              onSubmit={(input) => close(actions.addConnection(input))}
              onCancel={() => close()}
            />
          )}
          {connections.length === 0 && !form && (
            <p className="rounded-lg border border-dashed border-line-strong px-4 py-3 text-sm leading-relaxed text-muted">
              No connections yet. Connect two pieces of evidence to note whether one supports, challenges, or raises a
              question about the other, or simply connects to it.
            </p>
          )}
          {allConnected && <p className="text-xs text-subtle">Every pair of evidence is connected.</p>}
        </>
      )}

      {connections.length > 0 && (
        <ul aria-label="Connections" className="flex flex-col gap-2.5">
          {connections.map((connection) => {
            const from = cards.get(connection.fromEvidenceId);
            const to = cards.get(connection.toEvidenceId);
            // Never true for valid data: connections are removed with their evidence.
            if (!from || !to) return null;
            return (
              <li key={connection.id}>
                <ConnectionItem
                  connection={connection}
                  from={from}
                  to={to}
                  labels={labels}
                  onChange={(input) => actions.updateConnection(connection.id, input)}
                  onRemove={() => actions.removeConnection(connection.id)}
                  onOpenEvidence={onOpenEvidence}
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
