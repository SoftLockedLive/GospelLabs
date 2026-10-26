"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { DiscoveryCard } from "@/domain/study/user-data";
import { getStudyRepository } from "@/persistence/client";
import { toStorageError } from "@/persistence/storage-errors";

interface DeleteCardDialogProps {
  card: DiscoveryCard;
  open: boolean;
  onClose: () => void;
  onDeleted: (card: DiscoveryCard) => void;
}

export function DeleteCardDialog({ card, open, onClose, onDeleted }: DeleteCardDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setError(null);
    onClose();
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await getStudyRepository().deleteDiscovery(card.id);
      onDeleted(card);
    } catch (cause) {
      setError(toStorageError(cause).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Delete this discovery?"
      description={
        <>
          <strong className="font-medium text-fg">{card.title}</strong> will be removed from your Notebook and your Map
          {card.notes.trim() ? ", along with your notes on it" : ""}. This can&rsquo;t be undone.
        </>
      }
      footer={
        <>
          <Button variant="secondary" onClick={close} data-autofocus>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirm} disabled={busy}>
            <Trash2 aria-hidden />
            {busy ? "Deleting…" : "Delete discovery"}
          </Button>
        </>
      }
    >
      <p className="text-xs leading-relaxed text-subtle">
        What you studied stays completed, and connections you made yourself on the Map are kept. You can revisit the
        original any time.
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </Dialog>
  );
}
