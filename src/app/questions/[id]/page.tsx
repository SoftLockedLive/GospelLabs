import { ArrowLeft, FlaskConical, Lightbulb, ScrollText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/app-shell";
import { newInvestigationHref } from "@/lib/routes";
import { RandomQuestionButton } from "@/components/questions/random-question-button";
import { ReferenceList } from "@/components/questions/reference-list";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DIFFICULTY_LABELS } from "@/domain/question-bank";
import { QUESTION_BANK, getCuratedQuestion } from "@/lib/question-bank";

export function generateStaticParams() {
  return QUESTION_BANK.map((question) => ({ id: question.id }));
}

export async function generateMetadata({ params }: PageProps<"/questions/[id]">): Promise<Metadata> {
  const question = getCuratedQuestion((await params).id);
  return { title: question?.question ?? "Question not found" };
}

export default async function QuestionDetailPage({ params }: PageProps<"/questions/[id]">) {
  const { id } = await params;
  const question = getCuratedQuestion(id);
  if (!question) notFound();

  return (
    <PageContainer>
      <div className="flex max-w-4xl flex-col gap-8">
      <Link
        href="/questions"
        className="inline-flex w-fit items-center gap-1.5 rounded-md py-1 text-sm text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Question Bank
      </Link>

      <header>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs tracking-wide text-accent uppercase">{question.category}</span>
          <Badge>{DIFFICULTY_LABELS[question.difficulty]}</Badge>
        </div>
        <h1 className="mt-3 text-2xl leading-tight font-semibold tracking-tight text-fg sm:text-3xl">
          {question.question}
        </h1>
        {question.tags.length > 0 && (
          <ul aria-label="Tags" className="mt-4 flex flex-wrap gap-1.5">
            {question.tags.map((tag) => (
              <li key={tag} className="rounded-md bg-surface px-2 py-0.5 text-xs text-muted">
                #{tag}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href={newInvestigationHref(question.id)} size="lg">
            <FlaskConical aria-hidden />
            Start investigation
          </ButtonLink>
          <RandomQuestionButton
            questionIds={QUESTION_BANK.map((q) => q.id)}
            excludeId={question.id}
            label="Another random question"
          />
        </div>
      </header>

      {question.suggestedReferences.length > 0 && (
        <section aria-labelledby="references-heading">
          <Card>
            <CardContent>
              <h2 id="references-heading" className="flex items-center gap-2 text-base font-semibold text-fg">
                <ScrollText aria-hidden className="size-4 text-accent" />
                Suggested references
              </h2>
              <p className="mt-1.5 mb-5 text-sm leading-relaxed text-muted">
                Starting points for your own study. They aren&rsquo;t answers, and they become evidence only once
                you&rsquo;ve read them and recorded what you observed.
              </p>
              <ReferenceList references={question.suggestedReferences} />
            </CardContent>
          </Card>
        </section>
      )}

      {question.prompts.length > 0 && (
        <section aria-labelledby="prompts-heading">
          <Card>
            <CardContent>
              <h2 id="prompts-heading" className="flex items-center gap-2 text-base font-semibold text-fg">
                <Lightbulb aria-hidden className="size-4 text-accent" />
                Investigation prompts
              </h2>
              <ol className="mt-5 flex flex-col gap-3">
                {question.prompts.map((prompt, index) => (
                  <li key={prompt} className="flex gap-3 text-sm leading-relaxed text-muted">
                    <span aria-hidden className="w-5 shrink-0 font-mono text-xs leading-6 text-accent">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {prompt}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </section>
      )}

      {question.submittedBy && <p className="text-xs text-subtle">Suggested by {question.submittedBy}</p>}
      </div>
    </PageContainer>
  );
}
