"use client";

import { Shuffle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { pickRandomQuestion } from "@/domain/question-filters";

interface RandomQuestionButtonProps {
  /** Ids to choose from (for example, the current search results). */
  questionIds: readonly string[];
  /** Avoid picking this question again, e.g. the one currently open. */
  excludeId?: string;
  label?: string;
  variant?: "primary" | "secondary" | "ghost";
}

export function RandomQuestionButton({
  questionIds,
  excludeId,
  label = "Random question",
  variant = "secondary",
}: RandomQuestionButtonProps) {
  const router = useRouter();

  const openRandom = () => {
    const choice = pickRandomQuestion(
      questionIds.map((id) => ({ id })),
      { excludeId },
    );
    if (choice) router.push(`/questions/${choice.id}`);
  };

  return (
    <Button variant={variant} onClick={openRandom} disabled={questionIds.length === 0}>
      <Shuffle aria-hidden />
      {label}
    </Button>
  );
}
