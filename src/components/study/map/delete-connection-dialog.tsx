"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { PersonalConnection } from "@/domain/study/user-data";
import { RELATION_PHRASES } from "@/domain/study/vocabulary";
import { getStudyRepository } from "@/persistence/client";
import { toStorageError } from "@/persistence/storage-errors";

interface DeleteConnectionDialogProps {
  connection: PersonalConnection | null;
  /** Current labels for the two ends, if they're still on the map. */
  labelFor: (ref: PersonalConnection["from"]["ref"]) => string | undefined;
  onClose: () => void;
  onDeleted: (connection: PersonalConnection) => void;
}

export function DeleteConnectionDialog({ connection, labelFor, onClose, onDeleted }: DeleteConnectionDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setError(null);
    onClose();
  };

  const confirm = async () => {
    if (!connection) return;
    setBusy(true);
    setError(null);
    try {
      await getStudyRepository().personalConnections.delete(connection.id);
      onDeleted(connection);
    } catch (cause) {
      setError(toStorageError(cause).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={connection !== null}
      onClose={close}
      title="Delete your connection?"
      description={
        connection && (
          <>
            <strong className="font-medium text-fg">
              {labelFor(connection.from.ref) ?? connection.from.label} {RELATION_PHRASES[connection.relation]}{" "}
              {labelFor(connection.to.ref) ?? connection.to.label}
            </strong>{" "}
            and your note about it will be removed from your Map. Your discoveries aren&rsquo;t affected.
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
            {busy ? "Deleting…" : "Delete connection"}
          </Button>
        </>
      }
    >
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </Dialog>
  );
}
