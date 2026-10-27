"use client";

import { SearchX } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InvestigationWorkspace } from "@/components/workspace/investigation-workspace";
import { createInvestigation, createInvestigationFromQuestion } from "@/domain/investigation-factory";
import { createId } from "@/lib/ids";
import { getCuratedQuestion } from "@/lib/question-bank";

/** Starts a draft: blank for a custom question, or seeded from ?question=<id>. */
export function NewInvestigation() {
  const questionId = useSearchParams().get("question") ?? undefined;
  // bfcacheId changes on every fresh visit (link click) but not on Back/Forward,
  // so each visit gets a new draft while an in-progress one survives history moves.
  const { bfcacheId } = useRouter();
  return <Draft key={bfcacheId} questionId={questionId} />;
}

function Draft({ questionId }: { questionId?: string }) {
  // Captured once: after the first save the address changes to the saved
  // investigation's (without ?question=), and that must not reset the draft.
  const [draft] = useState(() => {
    const sourceQuestion = questionId ? getCuratedQuestion(questionId) : undefined;
    const options = { id: createId(), now: new Date().toISOString() };
    const initial = sourceQuestion
      ? createInvestigationFromQuestion(sourceQuestion, options)
      : createInvestigation(options);
    return { questionId, sourceQuestion, initial };
  });

  if (draft.questionId && !draft.sourceQuestion) {
    return (
      <EmptyState
        headingLevel={1}
        icon={SearchX}
        title="Question not found"
        description="That question isn’t in the Question Bank. It may have been removed or the link is incomplete."
        action={<ButtonLink href="/questions">Browse the Question Bank</ButtonLink>}
        className="mt-6 bg-surface"
      />
    );
  }

  // Not stored until the user edits it; then its URL becomes the saved investigation's.
  return <InvestigationWorkspace initial={draft.initial} stored={null} sourceQuestion={draft.sourceQuestion} />;
}
