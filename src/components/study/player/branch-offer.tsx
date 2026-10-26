"use client";

/** A side question offered at a step ("A related question: … — Explore / Not now"). Always optional. */
import { Check, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Branch } from "@/domain/study/content-schema";

interface BranchOfferProps {
  branch: Branch;
  visited: boolean;
  onExplore: () => void;
  onDismiss: () => void;
}

export function BranchOffer({ branch, visited, onExplore, onDismiss }: BranchOfferProps) {
  const steps = branch.steps.length;
  return (
    <aside aria-label="A related question" className="motion-reveal rounded-xl border border-dashed border-accent/45 bg-surface p-4 sm:p-5">
      <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] text-accent uppercase">
        <GitBranch aria-hidden className="size-3.5" />
        A related question
      </p>
      <p className="mt-2 font-serif text-lg leading-snug text-fg">{branch.question}</p>
      <p className="mt-1.5 text-xs text-subtle">
        Optional · {steps} {steps === 1 ? "step" : "steps"} · you&rsquo;ll come right back here
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button variant="secondary" onClick={onExplore} className="w-full sm:w-auto">
          {visited ? "Explore again" : "Explore"}
        </Button>
        {!visited && (
          <Button variant="ghost" onClick={onDismiss} className="w-full sm:w-auto">
            Not now
          </Button>
        )}
        {visited && (
          <span className="inline-flex items-center gap-1.5 text-xs text-green sm:ml-2">
            <Check aria-hidden className="size-3.5" />
            Explored
          </span>
        )}
      </div>
    </aside>
  );
}
