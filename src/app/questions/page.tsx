import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/app-shell";
import { QuestionBankBrowser } from "@/components/questions/question-bank-browser";
import { PageHeader } from "@/components/ui/page-header";
import { QUESTION_BANK } from "@/lib/question-bank";

export const metadata: Metadata = { title: "Question Bank" };

export default function QuestionBankPage() {
  return (
    <PageContainer className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Question Bank"
        title="Find a question worth studying"
        description="Curated questions with suggested starting points. None of them comes with a predetermined answer."
      />
      <QuestionBankBrowser questions={QUESTION_BANK} />
    </PageContainer>
  );
}
