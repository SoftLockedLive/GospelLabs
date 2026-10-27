import type { Metadata } from "next";
import { Suspense } from "react";
import { ConnectFrame, ConnectHeader, ConnectLoading } from "@/components/study/connect/connect-layout";
import { ConnectView } from "@/components/study/connect/connect-view";
import type { Source } from "@/domain/study/content-schema";
import { getSources, listConnectSessions } from "@/lib/study-content";

export const metadata: Metadata = {
  title: "Connect with Christ",
  description: "A few quiet minutes with the Savior: see Him in an account from His life, think through a question about His teachings, or reflect on a verse.",
};

/**
 * Connect with Christ. Every session and source is in the page, so it works
 * offline; which session to show is decided in the browser (it depends on
 * today's date and what was opened recently on this device).
 */
export default function ConnectPage() {
  const sessions = listConnectSessions();
  const cited = new Set(
    sessions.flatMap((session) => [
      session.sourceId,
      ...session.sources.map((source) => source.id),
      ...session.insights.flatMap((insight) => insight.sourceIds),
    ]),
  );
  const sources: Record<string, Source> = Object.fromEntries(getSources([...cited]).map((source) => [source.id, source]));

  return (
    // ?session= is read in the browser, so the static page renders this frame first.
    <Suspense
      fallback={
        <ConnectFrame>
          <ConnectHeader />
          <ConnectLoading />
        </ConnectFrame>
      }
    >
      <ConnectView sessions={sessions} sources={sources} />
    </Suspense>
  );
}
