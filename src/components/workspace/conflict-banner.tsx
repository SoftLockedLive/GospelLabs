"use client";

import { AlertTriangle } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import type { SaveConflict } from "@/persistence/investigation-repository";

interface ConflictBannerProps {
  conflict: SaveConflict;
  onKeepMine: () => void;
  onLoadStored: () => void;
}

/** Shown when autosave stops because the stored copy changed elsewhere. */
export function ConflictBanner({ conflict, onKeepMine, onLoadStored }: ConflictBannerProps) {
  const deleted = conflict === "deleted";

  return (
    <div role="alert" className="flex flex-col gap-3 rounded-xl border border-amber/40 bg-amber-soft px-4 py-3.5 text-sm text-fg">
      <p className="flex items-start gap-2">
        <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-amber" />
        <span>
          {deleted ? (
            <>
              <strong className="font-semibold">This investigation was deleted elsewhere</strong> (in another tab, or
              by importing a backup). Your recent edits here haven&rsquo;t been saved.
            </>
          ) : (
            <>
              <strong className="font-semibold">This investigation was changed in another tab or window.</strong> Your
              recent edits here haven&rsquo;t been saved, so nothing has been overwritten.
            </>
          )}
        </span>
      </p>
      <div className="flex flex-wrap gap-2 pl-6">
        <Button variant="secondary" size="sm" onClick={onKeepMine}>
          {deleted ? "Restore it with my version" : "Keep my version"}
        </Button>
        {deleted ? (
          <ButtonLink href="/library" variant="ghost" size="sm">
            Go to My Library
          </ButtonLink>
        ) : (
          <Button variant="ghost" size="sm" onClick={onLoadStored}>
            Discard my edits and load the other version
          </Button>
        )}
      </div>
    </div>
  );
}
