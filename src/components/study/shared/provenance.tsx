/**
 * Provenance labels. Every explanation, source, and connection in Gospel
 * Labs 2.0 says who it comes from, so learners can always tell scripture,
 * official teaching, a speaker's teaching, scholarship, the app's own
 * suggestions, their own interpretations, and AI-generated text apart.
 */
import { BookOpen, Bot, Building2, GraduationCap, Lightbulb, Mic, Sparkles, UserRound, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { PROVENANCE_LABELS, SOURCE_KIND_LABELS, type Provenance, type SourceKind } from "@/domain/study/vocabulary";

const SOURCE_ICONS: Record<SourceKind, LucideIcon> = {
  scripture: BookOpen,
  official: Building2,
  speaker: Mic,
  scholarly: GraduationCap,
};

const SOURCE_TONES = { scripture: "accent", official: "green", speaker: "amber", scholarly: "neutral" } as const;

export function SourceKindBadge({ kind, className }: { kind: SourceKind; className?: string }) {
  const Icon = SOURCE_ICONS[kind];
  return (
    <Badge tone={SOURCE_TONES[kind]} className={className}>
      <Icon aria-hidden />
      {SOURCE_KIND_LABELS[kind]}
    </Badge>
  );
}

const PROVENANCE_ICONS: Record<Provenance, LucideIcon> = {
  demonstrated: Sparkles,
  suggested: Lightbulb,
  user: UserRound,
  ai: Bot,
};

/** A small label naming who wrote the text next to it. */
export function ProvenanceLabel({ provenance, className }: { provenance: Provenance; className?: string }) {
  const Icon = PROVENANCE_ICONS[provenance];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        provenance === "demonstrated" && "text-green",
        provenance === "suggested" && "text-muted",
        provenance === "user" && "text-accent",
        provenance === "ai" && "text-amber",
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {PROVENANCE_LABELS[provenance]}
    </span>
  );
}
