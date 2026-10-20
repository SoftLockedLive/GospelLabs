"use client";

import { TriangleAlert } from "lucide-react";
import { PageContainer } from "@/components/layout/app-shell";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/** Catches unexpected rendering errors in a page, keeping the navigation usable. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
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
      </div>
    </PageContainer>
  );
}
