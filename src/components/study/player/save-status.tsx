"use client";

/**
 * Autosave state for study progress. Routine saving isn't announced; a
 * failure is, with a retry, and a reminder that the study keeps working.
 */
import { Check, LoaderCircle, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SaveStatus } from "./debounced-saver";

export function SaveStatusText({ status }: { status: SaveStatus }) {
  if (status.state === "pending" || status.state === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-subtle">
        <LoaderCircle aria-hidden className="size-3.5 motion-safe:animate-spin" />
        Saving…
      </span>
    );
  }
  if (status.state === "saved") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-subtle">
        <Check aria-hidden className="size-3.5 text-green" />
        Saved on this device
      </span>
    );
  }
  return null;
}

interface StorageNoticeProps {
  message: string;
  onRetry?: () => void;
  /** Defaults suit a study in progress: progress isn't being saved, and the study still works for this visit. */
  title?: string;
  detail?: string;
  retryLabel?: string;
}

/** Shown when progress couldn't be read or saved. */
export function StorageNotice({
  message,
  onRetry,
  title = "Your progress isn’t being saved.",
  detail = "You can keep studying; progress from this visit stays until you leave the page.",
  retryLabel = "Try again",
}: StorageNoticeProps) {
  return (
    <div role="alert" className="flex flex-col gap-2.5 rounded-xl border border-amber/40 bg-amber-soft px-4 py-3 text-sm text-fg sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2 leading-relaxed">
        <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-amber" />
        <span>
          <strong className="font-semibold">{title}</strong> {message}
          {detail && ` ${detail}`}
        </span>
      </p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="shrink-0 self-start sm:self-center">
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
