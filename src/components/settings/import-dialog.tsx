"use client";

import { AlertTriangle, Download, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AcknowledgeCheckbox, Dialog } from "@/components/ui/dialog";
import { DIFFICULTY_LABELS, STUDY_LENGTH_LABELS } from "@/domain/study/vocabulary";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { MOTION_LABELS } from "@/lib/preferences";
import { THEME_LABELS } from "@/lib/theme";
import {
  countContents,
  DATA_KIND_LABELS,
  DATA_KINDS,
  describeCounts,
  hasPreferences,
  totalCount,
  type ActivityPreferences,
  type BackupPreferences,
  type DataKind,
  type ImportMode,
  type ParsedBackup,
} from "@/persistence/backup";
import { restoreBackupPreferences } from "@/persistence/backup-preferences";
import { getRepository } from "@/persistence/client";
import { summaryCounts, type BackupImportSummary } from "@/persistence/full-backup";
import { toStorageError } from "@/persistence/storage-errors";
import { exportAllData } from "./export-backup";

export interface ImportResult {
  summary: BackupImportSummary;
  /** The backup's preferences were applied on this device. */
  preferencesRestored: boolean;
  /** The user asked for preferences too, but they couldn't be applied (the data import itself succeeded). */
  preferencesFailed: boolean;
}

interface ImportDialogProps {
  /** The validated backup to import, or null when closed. */
  pending: { fileName: string; backup: ParsedBackup } | null;
  onClose: () => void;
  onImported: (result: ImportResult) => void;
}

type Previews = Record<ImportMode, BackupImportSummary>;

/** Preferences are restored by default when replacing everything, and only on request when merging. */
const PREFERENCE_DEFAULTS: Record<ImportMode, boolean> = { merge: false, replace: true };

const ACTIVITY_LABELS: Record<keyof ActivityPreferences, string> = {
  offerBranches: "Side questions",
  showReflections: "Reflection prompts",
  suggestDifficulty: "Difficulty suggestions",
};

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "Theme: Parchment · Motion: Subtle · …", for the preferences checkbox. */
function describePreferences(preferences: BackupPreferences): string {
  const parts: string[] = [];
  if (preferences.theme) parts.push(`Theme: ${THEME_LABELS[preferences.theme]}`);
  if (preferences.motion) parts.push(`Motion: ${MOTION_LABELS[preferences.motion]}`);
  if (preferences.studyLength) parts.push(`Study length: ${STUDY_LENGTH_LABELS[preferences.studyLength]}`);
  if (preferences.difficulty) parts.push(`Difficulty: ${DIFFICULTY_LABELS[preferences.difficulty]}`);
  for (const [option, on] of Object.entries(preferences.activity ?? {}) as [keyof ActivityPreferences, boolean][]) {
    parts.push(`${ACTIVITY_LABELS[option] ?? option}: ${on ? "on" : "off"}`);
  }
  return parts.join(" · ");
}

/** One line per kind the import touches, e.g. "Discovery Cards: 2 new · 0 updated · 1 unchanged". */
function previewLines(summary: BackupImportSummary): string[] {
  return DATA_KINDS.flatMap((kind) => {
    const { added, updated, kept, removed } = summary.kinds[kind];
    const heading = DATA_KIND_LABELS[kind].heading;
    if (summary.mode === "replace") return removed + added > 0 ? [`${heading}: ${removed} deleted · ${added} restored`] : [];
    return added + updated + kept > 0 ? [`${heading}: ${added} new · ${updated} updated · ${kept} unchanged`] : [];
  });
}

/**
 * Shows what importing a backup would do, in both modes and per kind of
 * data, before anything changes. Replace requires an explicit
 * acknowledgement that lists what will be deleted, and both modes offer a
 * backup of the current data first when something on this device would be
 * deleted or overwritten. Preferences are applied only after the database
 * import has succeeded, and only if the user chose to.
 */
export function ImportDialog({ pending, onClose, onImported }: ImportDialogProps) {
  const [mode, setMode] = useState<ImportMode>("merge");
  const [previews, setPreviews] = useState<Previews | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [restorePreferences, setRestorePreferences] = useState(PREFERENCE_DEFAULTS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportNote, setExportNote] = useState<string | null>(null);

  const backup = pending?.backup;

  // Preview both modes against the data stored right now.
  useEffect(() => {
    if (!backup) return;
    let cancelled = false;
    const repository = getRepository();
    Promise.all([repository.previewBackup(backup, "merge"), repository.previewBackup(backup, "replace")]).then(
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
    setRestorePreferences(PREFERENCE_DEFAULTS);
    setError(null);
    setExportNote(null);
    onClose();
  };

  const contents = backup ? countContents(backup) : null;
  const nothingToImport = !contents || totalCount(contents) === 0;
  const replacing = mode === "replace";
  const removed = previews ? summaryCounts(previews.replace, "removed") : null;
  const needsAcknowledgement = replacing && removed !== null && totalCount(removed) > 0;
  const overwritten = !replacing && previews ? previews.merge.total.updated : 0;
  const offersPreferences = backup ? hasPreferences(backup.preferences) : false;
  const withPreferences = offersPreferences && restorePreferences[mode];

  const confirm = async () => {
    if (!backup) return;
    setBusy(true);
    setError(null);
    let summary: BackupImportSummary;
    try {
      summary = await getRepository().importBackup(backup, mode);
    } catch (cause) {
      setError(`${toStorageError(cause).message} Nothing was changed.`);
      setBusy(false);
      return;
    }
    // Only now that the data is safely imported.
    let preferencesRestored = false;
    let preferencesFailed = false;
    if (withPreferences) {
      try {
        preferencesRestored = restoreBackupPreferences(backup.preferences);
      } catch {
        preferencesFailed = true;
      }
    }
    setBusy(false);
    close();
    onImported({ summary, preferencesRestored, preferencesFailed });
  };

  const downloadCurrent = async () => {
    try {
      const { counts } = await exportAllData();
      setExportNote(`Downloaded a backup of ${describeCounts(counts, "your preferences")}.`);
    } catch (cause) {
      setExportNote(toStorageError(cause).message);
    }
  };

  const skipped: { kind: DataKind; index: number; id?: string; title?: string; reason: string }[] = backup
    ? [...backup.skipped.map((entry) => ({ ...entry, kind: "investigations" as const })), ...backup.studySkipped]
    : [];

  const downloadButton = (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="secondary" size="md" onClick={downloadCurrent}>
        <Download aria-hidden />
        Download a backup of my current data
      </Button>
      <span role="status" className="text-xs text-muted">
        {exportNote}
      </span>
    </div>
  );

  return (
    <Dialog
      open={pending !== null}
      onClose={close}
      title="Import backup"
      description={
        backup &&
        contents && (
          <>
            <span className="font-medium text-fg">{pending.fileName}</span>
            {backup.exportedAt && <> · exported {formatDate(backup.exportedAt)}</>} ·{" "}
            {describeCounts(contents, "nothing to import")}
            {backup.version < 3 && <> · made by Gospel Labs 1.x, before study data existed</>}
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
          {skipped.length > 0 && (
            <div className="rounded-lg border border-amber/40 bg-amber-soft px-3.5 py-3 text-sm">
              <p className="flex items-start gap-2 text-fg">
                <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-amber" />
                {skipped.length} {skipped.length === 1 ? "entry" : "entries"} in this file{" "}
                {skipped.length === 1 ? "is" : "are"} damaged, duplicated, or from a newer version and will be skipped.
              </p>
              <details className="pl-6 text-xs text-muted">
                <summary className="cursor-pointer py-3.5 text-fg">Show details</summary>
                <ul className="flex flex-col gap-1.5 pb-1">
                  {skipped.map((entry) => (
                    <li key={`${entry.kind}-${entry.index}`}>
                      <span className="text-fg">
                        {capitalize(DATA_KIND_LABELS[entry.kind].one)} #{entry.index + 1}{" "}
                        {entry.title ?? entry.id ?? "(no id)"}
                      </span>{" "}
                      — {entry.reason}
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          )}

          {backup.notes.length > 0 && (
            <div className="rounded-lg border border-line-strong bg-surface-sunken/50 px-3.5 py-3 text-sm">
              <p className="flex items-start gap-2 font-medium text-fg">
                <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
                About this file
              </p>
              <ul className="mt-1.5 flex flex-col gap-1.5 pl-6 text-xs leading-relaxed text-muted">
                {backup.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          )}

          {nothingToImport ? (
            <p className="text-sm text-muted">
              This backup doesn&rsquo;t contain any investigations or study data to import.
            </p>
          ) : (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium text-fg">How should it be imported?</legend>
              <ModeOption
                value="merge"
                selected={mode === "merge"}
                onSelect={setMode}
                title="Merge with my data (recommended)"
                description="Adds what's in the backup. If something exists in both places, the more recently updated copy is kept. Nothing is deleted."
                preview={previews && previewLines(previews.merge)}
              />
              <ModeOption
                value="replace"
                selected={mode === "replace"}
                onSelect={setMode}
                title="Replace all my data"
                description="Deletes every investigation and all study data on this device, then restores exactly what's in the backup."
                preview={previews && previewLines(previews.replace)}
              />
              {!previews && !error && (
                <p role="status" className="text-xs text-muted">
                  Checking what would change…
                </p>
              )}
            </fieldset>
          )}

          {!nothingToImport && offersPreferences && (
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line-strong px-3.5 py-3 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent">
              <input
                type="checkbox"
                checked={restorePreferences[mode]}
                onChange={(event) => setRestorePreferences((current) => ({ ...current, [mode]: event.target.checked }))}
                className="mt-0.5 size-4 shrink-0 accent-accent"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-fg">Also restore appearance and study preferences</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                  {describePreferences(backup.preferences)}
                </span>
              </span>
            </label>
          )}

          {overwritten > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-fg">
                {overwritten} {overwritten === 1 ? "item" : "items"} on this device will be replaced by{" "}
                {overwritten === 1 ? "a more recently updated copy" : "more recently updated copies"} from the backup.
              </p>
              {downloadButton}
            </div>
          )}

          {needsAcknowledgement && removed && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-fg">
                <strong className="font-semibold text-danger">
                  Everything now on this device will be permanently deleted:
                </strong>{" "}
                {describeCounts(removed)}. Anything you haven&rsquo;t exported will be lost.
              </p>
              {downloadButton}
              <AcknowledgeCheckbox checked={acknowledged} onChange={setAcknowledged}>
                I understand that my current investigations and study data will be deleted and can&rsquo;t be
                recovered.
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
  preview: string[] | null;
}

function ModeOption({ value, selected, onSelect, title, description, preview }: ModeOptionProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-3 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent",
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
        className="mt-1 size-4 shrink-0 accent-accent"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-fg">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted">{description}</span>
        {preview?.map((line) => (
          <span key={line} className="mt-1.5 block font-mono text-xs text-subtle">
            {line}
          </span>
        ))}
      </span>
    </label>
  );
}
