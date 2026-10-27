"use client";

/**
 * A long secondary list that starts collapsed on phones, behind one "Show …"
 * button right under the section heading. On wider screens the list always
 * shows and the button doesn't exist. Only items marked COLLAPSES_ON_PHONES
 * are hidden, so safety notes in the list stay visible. Following a link to
 * the section ("On this page") opens it.
 */
import { ChevronDown } from "lucide-react";
import { useId, useState, useSyncExternalStore, type ReactNode } from "react";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";

function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}
const readHash = () => window.location.hash;
const noHash = () => "";

interface PhoneCollapseProps {
  /** The section's anchor id, without "#". */
  sectionId?: string;
  /** How many items wait behind the button (those marked COLLAPSES_ON_PHONES). 0 shows everything. */
  hidden: number;
  /** True when some items stay visible anyway, so the button offers "more". */
  someShown?: boolean;
  /** What the items are: [one, many], e.g. ["passage", "passages"]. */
  noun: readonly [string, string];
  children: ReactNode;
}

export function PhoneCollapse({ sectionId, hidden, someShown = false, noun, children }: PhoneCollapseProps) {
  const contentId = useId();
  const hash = useSyncExternalStore(subscribeToHash, readHash, noHash);
  const [open, setOpen] = useState(false);
  const [seenHash, setSeenHash] = useState("");
  if (hash !== seenHash) {
    setSeenHash(hash);
    if (sectionId && hash === `#${sectionId}`) setOpen(true);
  }
  if (hidden === 0) return children;

  return (
    <div data-collapsed={open ? undefined : ""} className="group/phone flex flex-col gap-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen(!open)}
        className={cn(buttonClasses({ variant: "secondary" }), "w-full justify-between sm:hidden")}
      >
        {open ? "Show less" : `Show ${hidden} ${someShown ? "more " : ""}${hidden === 1 ? noun[0] : noun[1]}`}
        <ChevronDown aria-hidden className={cn("transition-transform duration-200", open && "rotate-180")} />
      </button>
      <div id={contentId}>{children}</div>
    </div>
  );
}
