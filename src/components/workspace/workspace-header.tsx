import type { ReactNode } from "react";
import { BackLink } from "@/components/ui/back-link";
import { StatusBadge } from "@/components/ui/badge";
import type { Investigation } from "@/domain/investigation";
import { formatDate } from "@/lib/format";

interface WorkspaceHeaderProps {
  investigation: Investigation;
  /** Autosave status, shown at the top right. */
  saveStatus: ReactNode;
}

export function WorkspaceHeader({ investigation, saveStatus }: WorkspaceHeaderProps) {
  const title = investigation.title.trim() || "Untitled notebook";

  return (
    <header className="flex flex-col gap-4">
      <BackLink href="/library">My Library</BackLink>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-title break-words text-fg">{title}</h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-subtle">
            <StatusBadge status={investigation.status} />
            {investigation.category && (
              <span className="min-w-0 break-words font-semibold">{investigation.category}</span>
            )}
            {investigation.updatedAt !== investigation.createdAt && (
              <span>Last edited {formatDate(investigation.updatedAt)}</span>
            )}
          </div>
        </div>
        {saveStatus}
      </div>
    </header>
  );
}
