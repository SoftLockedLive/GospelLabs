import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { mapHref } from "@/lib/routes";
import type { LabeledNode } from "@/domain/study/user-data";

interface ConceptChipProps {
  concept: LabeledNode & { demonstrated: boolean };
  /** Link to the concept on the Map. */
  linked?: boolean;
  className?: string;
}

/** A concept from a card. Discovered concepts carry a small sparkle; the label says which is which where it matters. */
export function ConceptChip({ concept, linked = false, className }: ConceptChipProps) {
  const classes = cn(
    "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
    concept.demonstrated ? "border-green/30 bg-green-soft text-green" : "border-line-strong text-muted",
    className,
  );
  const content = (
    <>
      {concept.demonstrated && <CircleCheck aria-hidden className="size-3 shrink-0" />}
      <span className="truncate">{concept.label}</span>
    </>
  );
  if (!linked) return <span className={classes}>{content}</span>;
  return (
    <Link
      href={mapHref(concept.ref)}
      className={cn(classes, "min-h-11 py-1 transition-colors hover:border-accent/50 hover:text-fg sm:min-h-8")}
      aria-label={`${concept.label}: see on Map`}
    >
      {content}
    </Link>
  );
}
