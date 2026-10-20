"use client";

import { Download, Trash2, Upload } from "lucide-react";
import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { MAX_BACKUP_BYTES, parseBackup, type ParsedBackup } from "@/persistence/backup";
import { useInvestigationList } from "@/persistence/hooks";
import type { ImportSummary } from "@/persistence/investigation-repository";
import { toStorageError } from "@/persistence/storage-errors";
import { DeleteAllDialog } from "./delete-all-dialog";
import { exportAllData } from "./export-backup";
import { ImportDialog } from "./import-dialog";
import { StoragePanel } from "./storage-panel";

type Feedback = { tone: "success" | "error"; text: string } | null;

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

function describeImport(summary: ImportSummary): string {
  if (summary.mode === "replace") {
    return `Replaced your data with ${plural(summary.added, "investigation")} from the backup.`;
  }
  return `Imported: ${summary.added} new, ${summary.updated} updated, ${summary.kept} unchanged.`;
}

export function DataManagement() {
  const list = useInvestigationList();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pendingImport, setPendingImport] = useState<{ fileName: string; backup: ParsedBackup } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [exporting, setExporting] = useState(false);

  const count = list.status === "ready" ? list.value.investigations.length : 0;
  const unavailable = list.status === "error";

  const exportData = async () => {
    setExporting(true);
    try {
      const { count: exported, unreadable } = await exportAllData();
      setFeedback({
        tone: "success",
        text:
          `Downloaded a backup of ${plural(exported, "investigation")}.` +
          (unreadable ? ` ${plural(unreadable, "damaged record")} couldn't be included.` : ""),
      });
    } catch (cause) {
      setFeedback({ tone: "error", text: toStorageError(cause).message });
    } finally {
      setExporting(false);
    }
  };

  const chooseFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow choosing the same file again
    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) {
      setFeedback({ tone: "error", text: "That file is too large to be a Gospel Labs backup." });
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      setFeedback({ tone: "error", text: "That file couldn't be read." });
      return;
    }
    const result = parseBackup(text);
    if (!result.ok) {
      setFeedback({ tone: "error", text: `Couldn't import “${file.name}”: ${result.error.message}` });
      return;
    }
    setFeedback(null);
    setPendingImport({ fileName: file.name, backup: result.backup });
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted">
        {list.status === "loading"
          ? "Checking saved data…"
          : unavailable
            ? list.error.message
            : `${plural(count, "investigation")} saved on this device.`}
      </p>

      <ul className="flex flex-col divide-y divide-line">
        <DataAction
          title="Export backup"
          description="Download all of your investigations as a JSON file. Keep it somewhere safe."
          action={
            <Button variant="secondary" size="sm" onClick={exportData} disabled={exporting || unavailable}>
              <Download aria-hidden />
              {exporting ? "Exporting…" : "Export backup"}
            </Button>
          }
        />
        <DataAction
          title="Import backup"
          description="Restore from a backup file. You'll choose whether to merge or replace before anything changes."
          action={
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={chooseFile}
              />
              <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={unavailable}>
                <Upload aria-hidden />
                Import backup
              </Button>
            </>
          }
        />
        <DataAction
          title="Delete all data"
          description="Permanently remove every investigation from this device."
          action={
            <Button variant="danger" size="sm" onClick={() => setConfirmingDelete(true)} disabled={count === 0}>
              <Trash2 aria-hidden />
              Delete all data
            </Button>
          }
        />
      </ul>

      {feedback && (
        <p
          role={feedback.tone === "error" ? "alert" : "status"}
          className={
            feedback.tone === "error"
              ? "rounded-lg border border-danger/40 bg-danger-soft px-3.5 py-2.5 text-sm text-fg"
              : "rounded-lg border border-green/30 bg-green-soft px-3.5 py-2.5 text-sm text-fg"
          }
        >
          {feedback.text}
        </p>
      )}

      <StoragePanel />

      <ImportDialog
        pending={pendingImport}
        onClose={() => setPendingImport(null)}
        onImported={(summary) => setFeedback({ tone: "success", text: describeImport(summary) })}
      />
      <DeleteAllDialog
        open={confirmingDelete}
        count={count}
        onClose={() => setConfirmingDelete(false)}
        onDeleted={(deleted) =>
          setFeedback({ tone: "success", text: `Deleted ${plural(deleted, "investigation")} from this device.` })
        }
      />
    </div>
  );
}

function DataAction({ title, description, action }: { title: string; description: string; action: ReactNode }) {
  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-fg">{title}</p>
        <p className="mt-0.5 text-sm text-muted">{description}</p>
      </div>
      <div className="flex items-center gap-2">{action}</div>
    </li>
  );
}
