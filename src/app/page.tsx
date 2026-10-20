import { BookOpen, FlaskConical } from "lucide-react";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { ProcessOverview } from "@/components/dashboard/process-overview";
import { PageContainer } from "@/components/layout/app-shell";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/page-header";
import { newInvestigationHref } from "@/lib/routes";

export default function DashboardPage() {
  return (
    <PageContainer className="flex flex-col gap-10 sm:gap-12">
      <section
        aria-labelledby="dashboard-title"
        className="relative overflow-hidden rounded-2xl border border-line bg-surface px-5 py-8 sm:px-10 sm:py-12"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-accent/10 blur-3xl"
        />
        <Eyebrow>Research notebook</Eyebrow>
        <h1 id="dashboard-title" className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
          Question. Study. Discover.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
          Bring a gospel question, gather what the scriptures and Church resources say, and reach your own
          understanding at your own pace.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href={newInvestigationHref()} size="lg">
            <FlaskConical aria-hidden />
            Start an investigation
          </ButtonLink>
          <ButtonLink href="/questions" size="lg" variant="secondary">
            <BookOpen aria-hidden />
            Browse question bank
          </ButtonLink>
        </div>
      </section>

      <DashboardOverview />

      <section aria-labelledby="process-heading">
        <h2 id="process-heading" className="mb-1 text-sm font-semibold tracking-tight text-fg">
          How an investigation works
        </h2>
        <p className="mb-4 text-sm text-muted">Move between stages freely. Nothing is required, and nothing is graded.</p>
        <ProcessOverview />
      </section>
    </PageContainer>
  );
}
