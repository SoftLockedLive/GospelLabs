"use client";

import { Download, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AcknowledgeCheckbox, Dialog } from "@/components/ui/dialog";
import { countOf, DATA_KINDS, describeCounts, totalCount, type DataCounts, type DataKind } from "@/persistence/backup";
import { getRepository } from "@/persistence/client";
import { toStorageError } from "@/persistence/storage-errors";
import { exportAllData } from "./export-backup";

interface DeleteAllDialogProps {
  open: boolean;
  /** What is stored right now, per kind. */
  counts: DataCounts;
  onClose: () => void;
  /** Called with what was actually deleted, per kind. */
  onDeleted: (removed: DataCounts) => void;
}

/** What each kind includes, so the list says exactly what will be lost. */
const INCLUDES: Partial<Record<DataKind, string>> = {
  investigations: "with their evidence, connections, insights, and notes",
  progress: "your progress, answers, and reflections",
  discoveries: "with your notes and highlights",
};

/**
 * Confirms deleting everything stored on this device: research
 * notebooks and all study data, in one transaction. Lists what will be
 * deleted per kind, offers a backup first, and requires an explicit
 * acknowledgement. Appearance and study preferences are kept.
 */
export function DeleteAllDialog({ open, counts, onClose, onDeleted }: DeleteAllDialogProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "status" | "alert"; text: string } | null>(null);

  const close = () => {
    setAcknowledged(false);
    setMessage(null);
    onClose();
  };

  const confirm = async () => {
    setBusy(true);
    try {
      const removed = await getRepository().deleteEverything();
      close();
      onDeleted(removed);
    } catch (cause) {
      setMessage({ tone: "alert", text: `${toStorageError(cause).message} Nothing was deleted.` });
    } finally {
      setBusy(false);
    }
  };

  const downloadFirst = async () => {
    try {
      const { counts: exported, unreadable } = await exportAllData();
      setMessage({
        tone: "status",
        text:
          `Downloaded a backup of ${describeCounts(exported, "your preferences (nothing else is saved yet)")}.` +
          (unreadable ? ` ${unreadable} damaged ${unreadable === 1 ? "record" : "records"} couldn’t be included.` : ""),
      });
    } catch (cause) {
      setMessage({ tone: "alert", text: toStorageError(cause).message });
    }
  };

  const kinds = DATA_KINDS.filter((kind) => counts[kind] > 0);

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Delete all data?"
      description={
        totalCount(counts) > 0 ? (
          <>Everything saved on this device will be permanently deleted. This can&rsquo;t be undone.</>
        ) : (
          <>Nothing is saved on this device.</>
        )
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
        {kinds.length > 0 && (
          <ul aria-label="Will be deleted" className="flex flex-col gap-1.5 text-sm text-fg">
            {kinds.map((kind) => (
              <li key={kind} className="flex gap-2.5">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-danger" />
                <span>
                  <span className="font-medium">{countOf(kind, counts[kind])}</span>
                  {INCLUDES[kind] && <span className="text-muted">—{INCLUDES[kind]}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-muted">Your appearance and study preferences are kept.</p>
        <div>
          <Button variant="secondary" size="md" onClick={downloadFirst}>
            <Download aria-hidden />
            Download a backup first
          </Button>
        </div>
        <div>
          <AcknowledgeCheckbox checked={acknowledged} onChange={setAcknowledged}>
            I understand that everything listed above will be deleted and can&rsquo;t be recovered.
          </AcknowledgeCheckbox>
          {/* Kept in the dialog, so screen readers announce the message when it appears. */}
          <div role="status">
            {message?.tone === "status" && <p className="mt-4 text-sm text-muted">{message.text}</p>}
          </div>
          {message?.tone === "alert" && (
            <p role="alert" className="mt-4 text-sm text-danger">
              {message.text}
            </p>
          )}
        </div>
      </div>
    </Dialog>
  );
}
