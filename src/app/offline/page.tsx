import { WifiOff } from "lucide-react";
import type { Metadata } from "next";
import { StatusPage } from "@/components/layout/status-page";
import { ButtonLink } from "@/components/ui/button";
import { notebookHref } from "@/lib/routes";

export const metadata: Metadata = { title: "Offline", robots: { index: false } };

/** Served by the service worker for pages that weren't saved for offline use. */
export default function OfflinePage() {
  return (
    <StatusPage
      icon={WifiOff}
      title="This page isn’t available offline"
      description="You’re offline, and this page hasn’t been saved on this device yet. Everything you’ve saved still works, along with the main pages of Gospel Labs: investigations, Scripture Explorer, your Notebook, and your research notebooks."
      actions={
        <>
          <ButtonLink href="/">Go to Home</ButtonLink>
          <ButtonLink href={notebookHref()} variant="secondary">
            Open your Notebook
          </ButtonLink>
          <ButtonLink href="/library" variant="secondary">
            My Library
          </ButtonLink>
        </>
      }
    />
  );
}
