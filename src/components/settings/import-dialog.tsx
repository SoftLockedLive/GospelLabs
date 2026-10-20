"use client";

import { AlertTriangle, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AcknowledgeCheckbox, Dialog } from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ImportMode, ParsedBackup } from "@/persistence/backup";
import { getRepository } from "@/persistence/client";
import type { ImportSummary } from "@/persistence/investigation-repository";
import { toStorageError } from "@/persistence/storage-errors";
import { exportAllData } from "./export-backup";

interface ImportDialogProps {
  /** The validated backup to import, or null when closed. */
  pending: { fileName: string; backup: ParsedBackup } | null;
  onClose: () => void;
  onImported: (summary: ImportSummary) => void;
}

type Previews = Record<ImportMode, ImportSummary>;

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export function ImportDialog({ pending, onClose, onImported }: ImportDialogProps) {
  const [mode, setMode] = useState<ImportMode>("merge");
  const [previews, setPreviews] = useState<Previews | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportNote, setExportNote] = useState<string | null>(null);

  const backup = pending?.backup;

  // Preview both modes against the data stored right now.
  useEffect(() => {
    if (!backup) return;
    let cancelled = false;
    const repository = getRepository();
    Promise.all([
      repository.previewImport(backup.investigations, "merge"),
      repository.previewImport(backup.investigations, "replace"),
    ]).then(
      ([merge, replace]) => !cancelled && setPreviews({ merge, replace }),
      (cause: unknown) => !cancelled && setError(toStorageError(cause).message),
    );
    return () => {
      cancelled = true;
    };
  }, [backup]);

  const close = () => {
    setMode("merge");
    setPreviews(null);
    setAcknowledged(false);
    setError(null);
    setExportNote(null);
    onClose();
  };

  const replacing = mode === "replace";
  const existing = previews?.replace.removed ?? 0;
  const needsAcknowledgement = replacing && existing > 0;
  const nothingToImport = (backup?.investigations.length ?? 0) === 0;

  const confirm = async () => {
    if (!backup) return;
    setBusy(true);
    setError(null);
    try {
      const summary = await getRepository().importInvestigations(backup.investigations, mode);
      close();
      onImported(summary);
    } catch (cause) {
      setError(`${toStorageError(cause).message} Nothing was changed.`);
    } finally {
      setBusy(false);
    }
  };

  const downloadCurrent = async () => {
    try {
      const { count } = await exportAllData();
      setExportNote(`Downloaded a backup of your ${plural(count, "investigation")}.`);
    } catch (cause) {
      setExportNote(toStorageError(cause).message);
    }
  };

  return (
    <Dialog
      open={pending !== null}
      onClose={close}
      title="Import backup"
      description={
        backup && (
          <>
            <span className="font-medium text-fg">{pending.fileName}</span>
            {backup.exportedAt && <> · exported {formatDate(backup.exportedAt)}</>} ·{" "}
            {plural(backup.investigations.length, "investigation")}
          </>
        )
      }
      footer={
        <>
          <Button variant="secondary" onClick={close} data-autofocus>
            Cancel
          </Button>
          {!nothingToImport && (
            <Button
              variant={replacing ? "danger" : "primary"}
              onClick={confirm}
              disabled={busy || !previews || (needsAcknowledgement && !acknowledged)}
            >
              {busy ? "Importing…" : replacing ? "Replace all data" : "Import"}
            </Button>
          )}
        </>
      }
    >
      {backup && (
        <div className="flex flex-col gap-5">
          {backup.skipped.length > 0 && (
            <div className="rounded-lg border border-amber/40 bg-amber-soft px-3.5 py-3 text-sm">
              <p className="flex items-start gap-2 text-fg">
                <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-amber" />
                {backup.skipped.length} {backup.skipped.length === 1 ? "entry" : "entries"} in this file {backup.skipped.length === 1 ? "is" : "are"} damaged or duplicated and will be skipped.
              </p>
              <details className="mt-2 pl-6 text-xs text-muted">
                <summary className="cursor-pointer text-fg">Show details</summary>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {backup.skipped.map((entry) => (
                    <li key={entry.index}>
                      <span className="text-fg">
                        #{entry.index + 1} {entry.title ?? entry.id ?? "(no id)"}
                      </span>{" "}
                      — {entry.reason}
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          )}

          {nothingToImport ? (
            <p className="text-sm text-muted">This backup doesn&rsquo;t contain any investigations to import.</p>
          ) : (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium text-fg">How should it be imported?</legend>
              <ModeOption
                value="merge"
                selected={mode === "merge"}
                onSelect={setMode}
                title="Merge with my data (recommended)"
                description="Adds investigations from the backup. If one exists in both places, the more recently edited copy is kept. Nothing is deleted."
                preview={
                  previews &&
                  `${previews.merge.added} new · ${previews.merge.updated} updated · ${previews.merge.kept} unchanged`
                }
              />
              <ModeOption
                value="replace"
                selected={mode === "replace"}
                onSelect={setMode}
                title="Replace all my data"
                description="Deletes every investigation on this device, then restores exactly what's in the backup."
                preview={previews && `${previews.replace.removed} deleted · ${previews.replace.added} restored`}
              />
            </fieldset>
          )}

          {needsAcknowledgement && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-fg">
                <strong className="font-semibold text-danger">Your current {plural(existing, "investigation")} will be
                permanently deleted.</strong>{" "}
                Investigations you haven&rsquo;t exported will be lost.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="secondary" size="sm" onClick={downloadCurrent}>
                  <Download aria-hidden />
                  Download a backup of my current data
                </Button>
                {exportNote && (
                  <span role="status" className="text-xs text-muted">
                    {exportNote}
                  </span>
                )}
              </div>
              <AcknowledgeCheckbox checked={acknowledged} onChange={setAcknowledged}>
                I understand that my current investigations will be deleted and can&rsquo;t be recovered.
              </AcknowledgeCheckbox>
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      )}
    </Dialog>
  );
}

interface ModeOptionProps {
  value: ImportMode;
  selected: boolean;
  onSelect: (mode: ImportMode) => void;
  title: string;
  description: string;
  preview: string | null;
}

function ModeOption({ value, selected, onSelect, title, description, preview }: ModeOptionProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
        selected
          ? value === "replace"
            ? "border-danger/50 bg-danger-soft"
            : "border-accent/50 bg-accent-soft"
          : "border-line-strong hover:border-accent/40",
      )}
    >
      <input
        type="radio"
        name="import-mode"
        value={value}
        checked={selected}
        onChange={() => onSelect(value)}
        className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-fg">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted">{description}</span>
        {preview && <span className="mt-1.5 block font-mono text-xs text-subtle">{preview}</span>}
      </span>
    </label>
  );
}
