"use client";

import { Download, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AcknowledgeCheckbox, Dialog } from "@/components/ui/dialog";
import { getRepository } from "@/persistence/client";
import { toStorageError } from "@/persistence/storage-errors";
import { exportAllData } from "./export-backup";

interface DeleteAllDialogProps {
  open: boolean;
  count: number;
  onClose: () => void;
  onDeleted: (count: number) => void;
}

export function DeleteAllDialog({ open, count, onClose, onDeleted }: DeleteAllDialogProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const close = () => {
    setAcknowledged(false);
    setMessage(null);
    onClose();
  };

  const confirm = async () => {
    setBusy(true);
    try {
      const deleted = await getRepository().deleteAll();
      close();
      onDeleted(deleted);
    } catch (cause) {
      setMessage(`${toStorageError(cause).message} Nothing was deleted.`);
    } finally {
      setBusy(false);
    }
  };

  const downloadFirst = async () => {
    try {
      const { count: exported } = await exportAllData();
      setMessage(`Downloaded a backup of ${exported} ${exported === 1 ? "investigation" : "investigations"}.`);
    } catch (cause) {
      setMessage(toStorageError(cause).message);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Delete all data?"
      description={
        <>
          All {count} {count === 1 ? "investigation" : "investigations"} on this device, with their evidence and
          notes, will be permanently deleted. This can&rsquo;t be undone.
        </>
      }
      footer={
        <>
          <Button variant="secondary" onClick={close} data-autofocus>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirm} disabled={!acknowledged || busy}>
            <Trash2 aria-hidden />
            {busy ? "Deleting…" : "Delete everything"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <Button variant="secondary" size="sm" onClick={downloadFirst}>
            <Download aria-hidden />
            Download a backup first
          </Button>
        </div>
        <AcknowledgeCheckbox checked={acknowledged} onChange={setAcknowledged}>
          I understand that all my investigations will be deleted and can&rsquo;t be recovered.
        </AcknowledgeCheckbox>
        {message && (
          <p role="status" className="text-sm text-muted">
            {message}
          </p>
        )}
      </div>
    </Dialog>
  );
}
