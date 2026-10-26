/**
 * A passage theme as a small chip, colored like its Discovery Map node kind
 * (concept, vocabulary term, or Christlike attribute).
 */
import { cn } from "@/lib/cn";
import { parseNodeRef, type NodeKind, type NodeRef } from "@/domain/study/vocabulary";

const TONES: Partial<Record<NodeKind, string>> = {
  concept: "border-node-concept/35 bg-node-concept/10 text-node-concept",
  vocabulary: "border-node-vocabulary/35 bg-node-vocabulary/10 text-node-vocabulary",
  attribute: "border-node-attribute/35 bg-node-attribute/10 text-node-attribute",
};

export const themeTone = (ref: NodeRef) => TONES[parseNodeRef(ref)?.kind ?? "concept"] ?? TONES.concept!;

export function ThemeChip({ label, themeRef, className }: { label: string; themeRef: NodeRef; className?: string }) {
  return (
    <span className={cn("inline-flex max-w-full items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", themeTone(themeRef), className)}>
      <span className="truncate">{label}</span>
    </span>
  );
}
