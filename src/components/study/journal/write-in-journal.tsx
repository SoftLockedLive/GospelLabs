"use client";

/**
 * "Write in your journal" from anywhere in the app: a sheet with the Journal's writing box, with the entry
 * linked to the place it was written (a step, a Connect with Christ session, a Discovery Card), so the Journal
 * can lead back here.
 */
import { PenLine } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import type { JournalEntryKind, JournalLink } from "@/domain/study/journal";
import { journalHref } from "@/lib/routes";
import { JournalComposer } from "./journal-composer";

interface WriteInJournalProps {
  link: JournalLink;
  initialKind?: JournalEntryKind;
  label?: string;
  className?: string;
}

export function WriteInJournal({ link, initialKind, label = "Write in your journal", className }: WriteInJournalProps) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <>
      <Button variant="link" onClick={() => setOpen(true)} aria-haspopup="dialog" className={className}>
        <PenLine aria-hidden />
        {label}
      </Button>
      <Sheet
        open={open}
        onClose={() => {
          setOpen(false);
          setSaved(false);
        }}
        title="Write in your journal"
        description="It’s saved in your Notebook, with a link back to here."
      >
        <div className="flex flex-col gap-4 px-2 pb-2">
          <JournalComposer key={String(open)} link={link} initialKind={initialKind} autoFocus onSaved={() => setSaved(true)} />
          {saved && (
            <Link href={journalHref()} className="text-[0.9375rem] font-semibold text-accent hover:underline">
              Open your journal
            </Link>
          )}
        </div>
      </Sheet>
    </>
  );
}
