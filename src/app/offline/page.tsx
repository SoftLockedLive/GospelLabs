import { WifiOff } from "lucide-react";
import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/app-shell";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Offline", robots: { index: false } };

/** Served by the service worker for pages that weren't saved for offline use. */
export default function OfflinePage() {
  return (
    <PageContainer>
      <EmptyState
        headingLevel={1}
        icon={WifiOff}
        title="This page isn't available offline"
        description="You're offline, and this page hasn't been saved on this device yet. Your investigations and the main pages of Gospel Labs still work."
        action={
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/library">Open My Library</ButtonLink>
            <ButtonLink href="/" variant="secondary">
              Go to Dashboard
            </ButtonLink>
          </div>
        }
        className="mt-6 bg-surface"
      />
    </PageContainer>
  );
}
