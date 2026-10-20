import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { StatusBadge } from "@/components/ui/badge";
import type { Investigation } from "@/domain/investigation";
import { formatDate } from "@/lib/format";

interface WorkspaceHeaderProps {
  investigation: Investigation;
  /** Autosave status, shown at the top right. */
  saveStatus: ReactNode;
}

export function WorkspaceHeader({ investigation, saveStatus }: WorkspaceHeaderProps) {
  const title = investigation.title.trim() || "Untitled investigation";

  return (
    <header className="flex flex-col gap-4">
      <Link
        href="/library"
        className="inline-flex w-fit items-center gap-1.5 rounded-md py-1 text-sm text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft aria-hidden className="size-4" />
        My Library
      </Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">{title}</h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-subtle">
            <StatusBadge status={investigation.status} />
            {investigation.category && (
              <span className="font-mono tracking-wide uppercase">{investigation.category}</span>
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
