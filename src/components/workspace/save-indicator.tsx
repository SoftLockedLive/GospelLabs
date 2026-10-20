"use client";

import { AlertTriangle, Check, CircleDashed, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SaveStatus } from "@/persistence/autosave";

const pill = "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs";

/**
 * Autosave state, shown in the workspace header. Routine "Saving…/Saved"
 * changes are not announced to screen readers; failures are.
 */
export function SaveIndicator({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  switch (status.state) {
    case "draft":
      return (
        <p className={`${pill} border-dashed border-line-strong text-subtle`}>
          <CircleDashed aria-hidden className="size-3.5" />
          Not saved yet · saves when you start editing
        </p>
      );
    case "pending":
    case "saving":
      return (
        <p className={`${pill} border-line text-subtle`}>
          <LoaderCircle aria-hidden className="size-3.5 motion-safe:animate-spin" />
          Saving…
        </p>
      );
    case "saved":
      return (
        <p className={`${pill} border-line text-subtle`}>
          <Check aria-hidden className="size-3.5 text-green" />
          Saved on this device
        </p>
      );
    case "error":
      return (
        <div role="alert" className="flex max-w-sm flex-col items-start gap-2 rounded-lg border border-danger/40 bg-danger-soft px-3 py-2.5 text-xs text-fg">
          <p className="flex items-start gap-1.5">
            <AlertTriangle aria-hidden className="mt-px size-3.5 shrink-0 text-danger" />
            <span>
              <strong className="font-semibold">Couldn&rsquo;t save.</strong> {status.message} Your edits are still
              here.
            </span>
          </p>
          <Button variant="secondary" size="sm" className="h-7" onClick={onRetry}>
            Try again
          </Button>
        </div>
      );
    case "conflict":
      return (
        <p className={`${pill} border-amber/40 text-amber`}>
          <AlertTriangle aria-hidden className="size-3.5" />
          Not saved
        </p>
      );
  }
}
