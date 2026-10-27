"use client";

import { SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { CuratedQuestion } from "@/domain/question-bank";
import {
  EMPTY_QUESTION_FILTERS,
  filterQuestions,
  hasActiveFilters,
  listCategories,
  type QuestionFilters,
} from "@/domain/question-filters";
import { QuestionCard } from "./question-card";
import { QuestionFiltersBar } from "./question-filters-bar";

export function QuestionBankBrowser({ questions }: { questions: readonly CuratedQuestion[] }) {
  const [filters, setFilters] = useState<QuestionFilters>(EMPTY_QUESTION_FILTERS);
  const categories = useMemo(() => listCategories(questions), [questions]);
  const results = useMemo(() => filterQuestions(questions, filters), [questions, filters]);
  const filtered = hasActiveFilters(filters);
  const clear = () => setFilters(EMPTY_QUESTION_FILTERS);

  return (
    <div className="flex flex-col gap-6">
      <QuestionFiltersBar
        filters={filters}
        categories={categories}
        resultIds={results.map((q) => q.id)}
        onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
      />

      <div className="flex min-h-8 items-center justify-between gap-3">
        <p aria-live="polite" className="text-sm text-muted">
          {filtered
            ? `${results.length} of ${questions.length} questions match`
            : `${questions.length} questions`}
        </p>
        {filtered && (
          <Button variant="ghost" size="sm" onClick={clear}>
            Clear filters
          </Button>
        )}
      </div>

      {results.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No questions match"
          description="Try different words, or broaden the topic or level."
          action={
            <Button variant="secondary" onClick={clear}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {results.map((question) => (
            <li key={question.id} className="flex">
              <QuestionCard question={question} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
