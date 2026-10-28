/**
 * Provenance labels. Every explanation, source, and connection in Gospel
 * Labs 2.0 says who it comes from, so learners can always tell scripture,
 * official teaching, a speaker's teaching, scholarship, the app's own
 * suggestions, their own interpretations, and AI-generated text apart.
 */
import { BookOpen, Bot, Building2, CircleCheck, GraduationCap, Lightbulb, Mic, UserRound, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { PROVENANCE_LABELS, SOURCE_KIND_LABELS, type Provenance, type SourceKind } from "@/domain/study/vocabulary";

const SOURCE_ICONS: Record<SourceKind, LucideIcon> = {
  scripture: BookOpen,
  official: Building2,
  speaker: Mic,
  scholarly: GraduationCap,
};

/**
 * What kind of source this is, as a quiet line of text beside its citation. Not a colored pill: every source has
 * one, and a row of pills made each citation shout.
 */
export function SourceKindBadge({ kind, className }: { kind: SourceKind; className?: string }) {
  const Icon = SOURCE_ICONS[kind];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap text-muted", className)}>
      <Icon aria-hidden className="size-3.5" />
      {SOURCE_KIND_LABELS[kind]}
    </span>
  );
}

const PROVENANCE_ICONS: Record<Provenance, LucideIcon> = {
  demonstrated: CircleCheck,
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

/**
 * The shorter label for a note on one item of an activity ("Why"), used where
 * the activity's own explanation already carries the full "Suggested by Gospel
 * Labs" label: repeating it on every item buried the notes. Screen readers
 * still hear who wrote it.
 */
export function WhyLabel({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-muted", className)}>
      <Lightbulb aria-hidden className="size-3.5" />
      Why<span className="sr-only"> (suggested by Gospel Labs)</span>
    </span>
  );
}
