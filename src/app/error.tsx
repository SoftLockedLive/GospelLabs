"use client";

import { TriangleAlert } from "lucide-react";
import { PageContainer } from "@/components/layout/app-shell";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { feedbackMailto } from "@/lib/feedback";

/** Catches unexpected rendering errors in a page, keeping the navigation usable. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PageContainer>
      <div role="alert">
        <EmptyState
          headingLevel={1}
          icon={TriangleAlert}
          title="Something went wrong on this page"
          description="Your saved investigations aren't affected. Try again, or go back to the dashboard."
          action={
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={reset}>Try again</Button>
              <ButtonLink href="/" variant="secondary">
                Go to Dashboard
              </ButtonLink>
            </div>
          }
          className="mt-6 bg-surface"
        />
        <p className="mt-4 text-center text-sm text-muted">
          If this keeps happening,{" "}
          <a
            href={feedbackMailto("bug", `Error shown: ${error.message.slice(0, 300)}`)}
            className="rounded-sm py-1 text-accent underline underline-offset-2"
          >
            report this problem
          </a>
          .
        </p>
      </div>
    </PageContainer>
  );
}
