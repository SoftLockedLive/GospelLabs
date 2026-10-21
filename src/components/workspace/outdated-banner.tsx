"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shown when another tab or window saved a newer copy of this investigation
 * while nothing here was unsaved. Loading it loses nothing.
 */
export function OutdatedBanner({ onLoadLatest }: { onLoadLatest: () => void }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-xl border border-accent/40 bg-accent-soft px-4 py-3.5 text-sm text-fg sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2">
        <RefreshCw aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
        <span>
          <strong className="font-semibold">This investigation was updated in another tab or window.</strong> Load the
          latest version before you keep working, so neither copy overwrites the other.
        </span>
      </p>
      <Button variant="secondary" size="sm" className="self-start sm:self-center" onClick={onLoadLatest}>
        Load the latest version
      </Button>
    </div>
  );
}
