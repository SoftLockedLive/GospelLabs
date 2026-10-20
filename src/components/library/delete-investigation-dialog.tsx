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
            <strong className="font-medium text-fg">{title}</strong>, including its{" "}
            {plural(investigation.evidence.length, "evidence card")},{" "}
            {plural(investigation.claims.length, "claim")}, and{" "}
            {plural(investigation.challengeResponses.length, "challenge response")}, will be permanently deleted from
            this device. This can&rsquo;t be undone.
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
