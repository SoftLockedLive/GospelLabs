import { ArrowRight, FlaskConical, Lightbulb, Route, ScrollText } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { DIFFICULTY_LABELS, type CuratedQuestion } from "@/domain/question-bank";
import { getTrailForQuestion } from "@/lib/discovery-trails";
import { newInvestigationHref } from "@/lib/routes";

export function QuestionCard({ question }: { question: CuratedQuestion }) {
  const referenceCount = question.suggestedReferences.length;
  const promptCount = question.prompts.length;
  const trail = getTrailForQuestion(question.id);

  return (
    <Card className="flex w-full flex-col transition-colors hover:border-line-strong">
      <CardContent className="flex flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] tracking-wide text-subtle uppercase">{question.category}</span>
          <Badge>{DIFFICULTY_LABELS[question.difficulty]}</Badge>
        </div>
        <h2 className="mt-3 text-base leading-snug font-medium text-fg">
          <Link href={`/questions/${question.id}`} className="rounded-sm hover:text-accent">
            {question.question}
          </Link>
        </h2>
        {question.tags.length > 0 && (
          <ul aria-label="Tags" className="mt-3 flex flex-wrap gap-1.5">
            {question.tags.map((tag) => (
              <li key={tag} className="rounded-md bg-surface-sunken px-2 py-0.5 text-xs text-muted">
                #{tag}
              </li>
            ))}
          </ul>
        )}
        <dl className="mt-auto flex flex-wrap gap-x-5 gap-y-1 pt-5 text-xs text-subtle">
          <div className="flex items-center gap-1.5">
            <ScrollText aria-hidden className="size-3.5" />
            <dt className="sr-only">Suggested references</dt>
            <dd>
              {referenceCount} {referenceCount === 1 ? "reference" : "references"}
            </dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Lightbulb aria-hidden className="size-3.5" />
            <dt className="sr-only">Investigation prompts</dt>
            <dd>
              {promptCount} {promptCount === 1 ? "prompt" : "prompts"}
            </dd>
          </div>
          {trail && (
            <div className="flex items-center gap-1.5 text-accent">
              <Route aria-hidden className="size-3.5" />
              <dt className="sr-only">Discovery trail</dt>
              <dd>Discovery trail · {trail.steps.length} steps</dd>
            </div>
          )}
        </dl>
      </CardContent>
      <CardFooter className="justify-between">
        <ButtonLink href={`/questions/${question.id}`} variant="ghost" size="sm" aria-label={`View details: ${question.question}`}>
          View details
          <ArrowRight aria-hidden />
        </ButtonLink>
        <ButtonLink
          href={newInvestigationHref(question.id)}
          variant="secondary"
          size="sm"
          aria-label={`Start investigation: ${question.question}`}
        >
          <FlaskConical aria-hidden />
          Start investigation
        </ButtonLink>
      </CardFooter>
    </Card>
  );
}
