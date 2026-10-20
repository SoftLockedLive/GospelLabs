"use client";

import { Search, X } from "lucide-react";
import { Input, Select } from "@/components/ui/input";
import { DIFFICULTIES, DIFFICULTY_LABELS, type Difficulty } from "@/domain/question-bank";
import type { CategorySummary, QuestionFilters } from "@/domain/question-filters";
import { RandomQuestionButton } from "./random-question-button";

interface QuestionFiltersBarProps {
  filters: QuestionFilters;
  categories: CategorySummary[];
  /** Current results; the random button picks from these. */
  resultIds: string[];
  onChange: (patch: Partial<QuestionFilters>) => void;
}

export function QuestionFiltersBar({ filters, categories, resultIds, onChange }: QuestionFiltersBarProps) {
  return (
    <div
      role="search"
      aria-label="Filter questions"
      className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3 lg:flex-row lg:items-center"
    >
      <div className="relative flex-1">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
        <Input
          type="search"
          aria-label="Search questions"
          placeholder="Search questions, tags, or references"
          className="pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
          value={filters.query}
          onChange={(event) => onChange({ query: event.target.value })}
        />
        {filters.query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onChange({ query: "" })}
            className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-subtle hover:text-fg"
          >
            <X aria-hidden className="size-4" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:flex">
        <Select
          aria-label="Topic"
          className="lg:w-48"
          value={filters.category ?? ""}
          onChange={(event) => onChange({ category: event.target.value || null })}
        >
          <option value="">All topics</option>
          {categories.map((category) => (
            <option key={category.name} value={category.name}>
              {category.name} ({category.count})
            </option>
          ))}
        </Select>
        <Select
          aria-label="Difficulty"
          className="lg:w-40"
          value={filters.difficulty ?? ""}
          onChange={(event) => onChange({ difficulty: (event.target.value || null) as Difficulty | null })}
        >
          <option value="">Any difficulty</option>
          {DIFFICULTIES.map((difficulty) => (
            <option key={difficulty} value={difficulty}>
              {DIFFICULTY_LABELS[difficulty]}
            </option>
          ))}
        </Select>
      </div>
      <RandomQuestionButton questionIds={resultIds} label="Random" />
    </div>
  );
}
