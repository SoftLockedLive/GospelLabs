import { ArrowRight, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DiscoveryTrail } from "@/domain/discovery-trails";
import type { Investigation } from "@/domain/investigation";
import { findTrailProgress } from "@/domain/investigation-reducer";

/** Points out, from the Question section, that this question has an optional discovery trail in Research. */
export function TrailNotice({
  trail,
  investigation,
  onOpen,
}: {
  trail: DiscoveryTrail;
  investigation: Investigation;
  onOpen: () => void;
}) {
  const progress = findTrailProgress(investigation, trail.id);
  const explored = progress?.steps.filter((step) => step.explored).length ?? 0;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-accent/25 bg-accent-soft p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="flex items-center gap-2 text-sm font-medium text-fg">
          <Route aria-hidden className="size-4 shrink-0 text-accent" />
          Discovery trail: {trail.title}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          {trail.steps.length} steps · {explored} explored. Optional, and you can take the steps in any order.
        </p>
      </div>
      <Button variant="secondary" size="sm" className="self-start sm:self-center" onClick={onOpen}>
        {progress ? "Continue the trail" : "Open the trail"}
        <ArrowRight aria-hidden />
      </Button>
    </div>
  );
}
