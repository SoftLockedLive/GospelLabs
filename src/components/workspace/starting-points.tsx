import { BookOpen, ChevronDown, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { CuratedQuestion } from "@/domain/question-bank";

/** Prompts and references from the curated question, shown as optional guidance. */
export function StartingPoints({ question }: { question: CuratedQuestion }) {
  return (
    <details className="group rounded-xl border border-line bg-surface-sunken/60">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm text-fg [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <BookOpen aria-hidden className="size-4 text-accent" />
          Starting points from the question bank
        </span>
        <ChevronDown aria-hidden className="size-4 text-subtle transition-transform group-open:rotate-180" />
      </summary>
      <div className="flex flex-col gap-5 border-t border-line px-4 py-4 text-sm">
        {question.prompts.length > 0 && (
          <div>
            <p className="text-xs font-medium text-fg">Prompts to consider</p>
            <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-4 text-muted marker:text-subtle">
              {question.prompts.map((prompt) => (
                <li key={prompt}>{prompt}</li>
              ))}
            </ul>
          </div>
        )}
        {question.suggestedReferences.length > 0 && (
          <div>
            <p className="text-xs font-medium text-fg">Suggested references</p>
            <ul className="mt-2 flex flex-col gap-1.5 text-muted">
              {question.suggestedReferences.map((reference) => (
                <li key={reference.label}>
                  {reference.url ? (
                    <a
                      href={reference.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-sm py-0.5 text-accent hover:underline"
                    >
                      {reference.label}
                      <ExternalLink aria-hidden className="size-3" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  ) : (
                    reference.label
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-subtle">
              Starting points only. Record what you find as evidence in Research.
            </p>
          </div>
        )}
        <Link href={`/questions/${question.id}`} className="inline-block w-fit rounded-sm py-1 text-xs text-muted hover:text-fg hover:underline">
          Open this question in the Question Bank
        </Link>
      </div>
    </details>
  );
}
