"use client";

/**
 * Words to know: each word opens (tap, Enter, or Space) to its meaning and
 * sources. Opening a word records it in the learner's Exploration, which is
 * all "explored" means here: the word was opened.
 */
import { Check, ChevronDown } from "lucide-react";
import { useId, useState, type CSSProperties } from "react";
import type { ChristAttribute, Source } from "@/domain/study/content-schema";
import { cn } from "@/lib/cn";
import { StudySection } from "./attribute-sections";
import { useAttributeStudy } from "./attribute-study-context";
import { SourceCitations } from "./source-citations";

export function VocabularySection() {
  const { attribute, sources, exploration, openWord } = useAttributeStudy();
  const explored = new Set(exploration.status === "ready" ? (exploration.value?.vocabulary ?? []) : []);
  return (
    <StudySection id="words" title="Words to know" description="Open a word to see what it means and where the meaning comes from.">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {attribute.vocabulary.map((word, index) => (
          <li key={word.id} className="motion-reveal" style={{ "--motion-index": index } as CSSProperties}>
            <VocabularyCard word={word} sources={sources} explored={explored.has(word.id)} onOpen={() => openWord(word.id)} />
          </li>
        ))}
      </ul>
    </StudySection>
  );
}

interface VocabularyCardProps {
  word: ChristAttribute["vocabulary"][number];
  sources: Readonly<Record<string, Source>>;
  explored: boolean;
  onOpen: () => void;
}

function VocabularyCard({ word, sources, explored, onOpen }: VocabularyCardProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <div
      className={cn(
        "rounded-xl border bg-surface transition-colors",
        open ? "border-node-vocabulary/45 shadow-soft" : "border-line hover:border-node-vocabulary/40",
      )}
    >
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => {
            const next = !open;
            setOpen(next);
            if (next) onOpen();
          }}
          className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span aria-hidden className="size-2 shrink-0 rounded-full bg-node-vocabulary" />
            <span className="font-serif text-[1.0625rem] leading-snug text-fg">{word.term}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2 text-subtle">
            {explored && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green">
                <Check aria-hidden className="size-3.5" />
                <span className={open ? "sr-only" : "sr-only sm:not-sr-only"}>Explored</span>
              </span>
            )}
            <ChevronDown aria-hidden className={cn("size-4 transition-transform duration-200", open && "rotate-180")} />
          </span>
        </button>
      </h3>
      <div id={panelId} hidden={!open} className="motion-reveal border-t border-line px-4 pt-3 pb-4">
        <p className="text-sm leading-relaxed text-fg">{word.meaning}</p>
        <SourceCitations sourceIds={word.sourceIds} sources={sources} className="mt-3" />
      </div>
    </div>
  );
}
