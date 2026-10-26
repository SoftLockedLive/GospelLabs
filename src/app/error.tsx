"use client";

import { TriangleAlert } from "lucide-react";
import { StatusPage } from "@/components/layout/status-page";
import { Button, ButtonLink } from "@/components/ui/button";
import { feedbackMailto } from "@/lib/feedback";

/** Catches unexpected rendering errors in a page, keeping the navigation usable. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert">
      <StatusPage
        icon={TriangleAlert}
        tone="danger"
        title="Something went wrong on this page"
        description="Your saved study isn't affected: research notebooks, investigations, and discoveries are all still on this device. Try again, or go back to Home."
        actions={
          <>
            <Button onClick={reset}>Try again</Button>
            <ButtonLink href="/" variant="secondary">
              Back to Home
            </ButtonLink>
          </>
        }
      >
        <p className="mt-6 text-sm text-muted">
          If this keeps happening,{" "}
          <a
            href={feedbackMailto("bug", `Error shown: ${error.message.slice(0, 300)}`)}
            className="rounded-sm py-1 text-accent underline underline-offset-2"
          >
            report this problem
          </a>
          .
        </p>
      </StatusPage>
    </div>
  );
}
