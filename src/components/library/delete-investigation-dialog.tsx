"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { Investigation } from "@/domain/investigation";
import { getRepository } from "@/persistence/client";
import { toStorageError } from "@/persistence/storage-errors";

interface DeleteInvestigationDialogProps {
  investigation: Investigation | null;
  onClose: () => void;
  onDeleted: (investigation: Investigation) => void;
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** "2 evidence cards, 1 claim, and 3 challenge responses": what deleting an investigation removes. */
function describeContents(investigation: Investigation): string {
  const trailNotes = investigation.trailProgress.reduce(
    (count, trail) => count + trail.steps.filter((step) => step.discoveries.trim()).length,
    0,
  );
  const parts = [
    plural(investigation.evidence.length, "evidence card"),
    plural(investigation.claims.length, "claim"),
    ...(investigation.evidenceConnections.length > 0
      ? [plural(investigation.evidenceConnections.length, "evidence connection")]
      : []),
    ...(investigation.discoveryHighlights.length > 0
      ? [
          investigation.discoveryHighlights.length === 1
            ? "1 saved discovery"
            : `${investigation.discoveryHighlights.length} saved discoveries`,
        ]
      : []),
    ...(investigation.challengeResponses.length > 0
      ? [plural(investigation.challengeResponses.length, "challenge response")]
      : []),
    ...(trailNotes > 0 ? [`notes on ${plural(trailNotes, "trail step")}`] : []),
  ];
  return parts.length === 2 ? parts.join(" and ") : `${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)}`;
}

export function DeleteInvestigationDialog({ investigation, onClose, onDeleted }: DeleteInvestigationDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setError(null);
    onClose();
  };

  const confirm = async () => {
    if (!investigation) return;
    setBusy(true);
    setError(null);
    try {
      await getRepository().delete(investigation.id);
      onDeleted(investigation);
    } catch (cause) {
      setError(toStorageError(cause).message);
    } finally {
      setBusy(false);
    }
  };

  const title = investigation?.title.trim() || "Untitled investigation";

  return (
    <Dialog
      open={investigation !== null}
      onClose={close}
      title="Delete this investigation?"
      description={
        investigation && (
          <>
            <strong className="font-medium text-fg">{title}</strong>, including its {describeContents(investigation)},
            will be permanently deleted from this device. This can&rsquo;t be undone.
          </>
        )
      }
      footer={
        <>
          <Button variant="secondary" onClick={close} data-autofocus>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirm} disabled={busy}>
            <Trash2 aria-hidden />
            {busy ? "Deleting…" : "Delete investigation"}
          </Button>
        </>
      }
    >
      <p className="text-xs leading-relaxed text-subtle">
        Tip: Settings › Export backup saves a copy of all your investigations first.
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </Dialog>
  );
}
