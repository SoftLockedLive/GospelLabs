"use client";

import { Download, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  describeCounts,
  MAX_BACKUP_BYTES,
  parseBackup,
  totalCount,
  zeroCounts,
  type DataCounts,
  type ParsedBackup,
} from "@/persistence/backup";
import { getRepository, getStudyRepository } from "@/persistence/client";
import { summaryCounts } from "@/persistence/full-backup";
import { toStorageError } from "@/persistence/storage-errors";
import { useLiveStudyQuery } from "@/persistence/study-hooks";
import { DeleteAllDialog } from "./delete-all-dialog";
import { exportAllData } from "./export-backup";
import { ImportDialog, type ImportResult } from "./import-dialog";
import { SavedDataSummary, StoragePanel } from "./storage-panel";

type Feedback = { tone: "success" | "error"; text: string } | null;

/**
 * Every stored record of each kind, readable or not (what deleting
 * everything removes). Uses only operations that are safe inside a live
 * query (see client.ts), so the summary follows imports, deletions, and
 * other tabs.
 */
async function readCounts(): Promise<DataCounts> {
  const { investigations, unreadable } = await getRepository().list();
  const study = await getStudyRepository().counts();
  return { ...zeroCounts(), ...study, investigations: investigations.length + unreadable };
}

function describeImport({ summary, preferencesRestored, preferencesFailed }: ImportResult): string {
  const preferences = preferencesRestored
    ? " Appearance and study preferences restored."
    : preferencesFailed
      ? " Your preferences couldn’t be restored on this device."
      : "";
  if (summary.mode === "replace") {
    return `Replaced your data with ${describeCounts(summaryCounts(summary, "added"))} from the backup.${preferences}`;
  }
  const { added, updated, kept } = summary.total;
  return `Imported: ${added} new, ${updated} updated, ${kept} unchanged.${preferences}`;
}

export function DataManagement() {
  // Create the repository (which starts unsaved-edit recovery) before the
  // live query below runs: recovery saves, and Dexie refuses read-write
  // transactions started from inside a live query. Effects run in order.
  useEffect(() => {
    getRepository();
  }, []);
  const counts = useLiveStudyQuery(readCounts, "settings:data-counts");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pendingImport, setPendingImport] = useState<{ fileName: string; backup: ParsedBackup } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [exporting, setExporting] = useState(false);

  const stored = counts.status === "ready" ? counts.value : zeroCounts();
  const unavailable = counts.status === "error";

  const exportData = async () => {
    setExporting(true);
    try {
      const { counts: exported, unreadable } = await exportAllData();
      setFeedback({
        tone: "success",
        text:
          `Downloaded a backup of ${describeCounts(exported, "your preferences (nothing else is saved yet)")}.` +
          (unreadable ? ` ${unreadable} damaged ${unreadable === 1 ? "record" : "records"} couldn’t be included.` : ""),
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
      setFeedback({ tone: "error", text: "That file couldn’t be read." });
      return;
    }
    const result = parseBackup(text);
    if (!result.ok) {
      setFeedback({ tone: "error", text: `Couldn’t import “${file.name}”: ${result.error.message} Nothing was changed.` });
      return;
    }
    setFeedback(null);
    setPendingImport({ fileName: file.name, backup: result.backup });
  };

  return (
    <div className="flex flex-col gap-5">
      {counts.status === "ready" ? (
        <SavedDataSummary counts={counts.value} />
      ) : (
        <p className="text-sm text-muted">{counts.status === "loading" ? "Checking saved data…" : counts.error.message}</p>
      )}

      <div>
        <ul className="flex flex-col divide-y divide-line">
          <DataAction
            title="Export backup"
            description="Download everything as a file: your research notebooks, investigation progress, Discovery Cards, journal, Map connections, what you’ve saved in Scripture Explorer and Character of Christ, and your preferences. Keep it somewhere safe."
            action={
              <Button variant="secondary" size="md" onClick={exportData} disabled={exporting || unavailable}>
                <Download aria-hidden />
                {exporting ? "Exporting…" : "Export backup"}
              </Button>
            }
          />
          <DataAction
            title="Import backup"
            description="Restore from a backup file, including files from Gospel Labs 1.x. You’ll see what would change and choose whether to merge or replace before anything changes."
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
                <Button variant="secondary" size="md" onClick={() => fileInputRef.current?.click()} disabled={unavailable}>
                  <Upload aria-hidden />
                  Import backup
                </Button>
              </>
            }
          />
          <DataAction
            title="Delete all data"
            description="Permanently remove your research notebooks, investigation progress, Discovery Cards, journal, Map connections, and everything else you’ve saved from this device. Preferences are kept."
            action={
              <Button
                variant="danger"
                size="md"
                onClick={() => setConfirmingDelete(true)}
                disabled={unavailable || totalCount(stored) === 0}
              >
                <Trash2 aria-hidden />
                Delete all data
              </Button>
            }
          />
        </ul>
        {/* Kept in the page, so screen readers announce each new message. */}
        <div role="status">
          {feedback?.tone === "success" && (
            <p className="mt-5 rounded-lg border border-green/30 bg-green-soft px-3.5 py-2.5 text-sm text-fg">{feedback.text}</p>
          )}
        </div>
        {feedback?.tone === "error" && (
          <p role="alert" className="mt-5 rounded-lg border border-danger/40 bg-danger-soft px-3.5 py-2.5 text-sm text-fg">
            {feedback.text}
          </p>
        )}
      </div>

      <StoragePanel />

      <ImportDialog
        pending={pendingImport}
        onClose={() => setPendingImport(null)}
        onImported={(result) => setFeedback({ tone: "success", text: describeImport(result) })}
      />
      <DeleteAllDialog
        open={confirmingDelete}
        counts={stored}
        onClose={() => setConfirmingDelete(false)}
        onDeleted={(removed) =>
          setFeedback({
            tone: "success",
            text:
              totalCount(removed) > 0
                ? `Deleted ${describeCounts(removed)} from this device.`
                : "There was nothing to delete.",
          })
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
