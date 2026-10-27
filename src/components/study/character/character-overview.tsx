"use client";

/**
 * The Character of Christ overview: one card per attribute, with a few of its
 * words and a quiet note when the learner has opened it before ("Explored ·
 * 4 words"). There are no percentages, totals, badges, or rankings: this
 * records what was studied, never how Christlike anyone is.
 */
import { Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { explorationSummary } from "@/domain/study/character";
import type { Exploration } from "@/domain/study/user-data";
import { characterHref } from "@/lib/routes";
import { useExplorations } from "@/persistence/study-hooks";

export interface AttributeOverviewItem {
  id: string;
  name: string;
  summary: string;
  /** A few vocabulary terms to preview. */
  words: string[];
}

export function AttributeGrid({ attributes }: { attributes: readonly AttributeOverviewItem[] }) {
  const explorations = useExplorations("attribute");
  const byAttribute = new Map<string, Exploration>(
    explorations.status === "ready" ? explorations.value.map((record) => [record.contentId, record]) : [],
  );

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
      {attributes.map((attribute, index) => {
        const explored = explorationSummary(byAttribute.get(attribute.id));
        return (
          <li key={attribute.id} className="motion-reveal" style={{ "--motion-index": index } as CSSProperties}>
            <article className="group relative flex h-full flex-col gap-2.5 rounded-2xl border border-line bg-surface p-4 transition-colors has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-accent hover:border-node-attribute/45 hover:bg-surface-raised sm:gap-3 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-serif text-xl leading-snug text-fg">
                  <Link href={characterHref(attribute.id)} className="outline-none after:absolute after:inset-0 after:rounded-2xl">
                    {attribute.name}
                  </Link>
                </h3>
                <ChevronRight
                  aria-hidden
                  className="mt-1 size-5 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-node-attribute"
                />
              </div>
              <p className="text-sm leading-relaxed text-muted">{attribute.summary}</p>
              {attribute.words.length > 0 && (
                <ul aria-label={`Some words to know for ${attribute.name.toLowerCase()}`} className="mt-auto flex flex-wrap gap-1.5 pt-1">
                  {attribute.words.map((word) => (
                    <li key={word} className="rounded-md bg-node-vocabulary/12 px-2 py-0.5 text-xs text-fg">
                      {word}
                    </li>
                  ))}
                </ul>
              )}
              {explored && (
                <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
                  <Check aria-hidden className="size-3.5 text-green" />
                  {explored}
                </p>
              )}
            </article>
          </li>
        );
      })}
    </ul>
  );
}
