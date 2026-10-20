import { INVESTIGATION_STATUSES, STATUS_LABELS, type Investigation, type InvestigationStatus } from "@/domain/investigation";
import { cn } from "@/lib/cn";

const dotColor: Record<InvestigationStatus, string> = {
  investigating: "bg-accent",
  "partially-understood": "bg-amber",
  concluded: "bg-green",
};

export function StatusOverview({ investigations }: { investigations: readonly Investigation[] }) {
  return (
    <dl className="grid grid-cols-3 gap-3">
      {INVESTIGATION_STATUSES.map((status) => {
        const count = investigations.filter((i) => i.status === status).length;
        return (
          <div key={status} className="flex flex-col justify-between gap-2 rounded-xl border border-line bg-surface px-4 py-4 sm:px-5">
            <dt className="flex items-start gap-2 text-xs leading-snug text-muted">
              <span aria-hidden className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", dotColor[status])} />
              {STATUS_LABELS[status]}
            </dt>
            <dd className="font-mono text-2xl font-medium tabular-nums text-fg">{count}</dd>
          </div>
        );
      })}
    </dl>
  );
}
