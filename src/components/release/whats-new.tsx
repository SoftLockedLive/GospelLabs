"use client";

/**
 * Tells returning learners that Gospel Labs was updated, and what changed
 * since the version they last saw: on whatever page they open first, until
 * they dismiss it. Content-only releases get a one-line note instead.
 *
 * Also decides who is new: a device with no recorded version and nothing
 * stored gets the welcome (on the dashboard) instead, and never this card.
 */
import { BookOpenText, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Disclosure } from "@/components/ui/disclosure";
import { assumedLastSeen, isContentOnly, releasesSince, type Release } from "@/domain/changelog";
import { APP_RELEASE } from "@/lib/app-version";
import { CHANGELOG, markSeen, readDeviceHistory, readLastSeen, readWelcome, setWelcome } from "@/lib/release-state";
import { ReleaseList } from "./release-list";
import { TourDialog } from "./tour-dialog";

type State = { kind: "hidden" } | { kind: "whats-new"; releases: Release[] };

/** What to show on this device: the releases it hasn't seen, or nothing (marking new learners for the welcome). */
async function decide(): Promise<State> {
  const lastSeen = readLastSeen();
  if (lastSeen) {
    const releases = releasesSince(CHANGELOG, lastSeen, APP_RELEASE);
    return releases.length ? { kind: "whats-new", releases } : { kind: "hidden" };
  }
  const assumed = assumedLastSeen(await readDeviceHistory());
  if (!assumed) {
    // Someone new: from now on they're current, and the dashboard welcomes them.
    markSeen(APP_RELEASE);
    if (!readWelcome()) setWelcome("pending");
    return { kind: "hidden" };
  }
  const releases = releasesSince(CHANGELOG, assumed, APP_RELEASE);
  if (!releases.length) markSeen(APP_RELEASE);
  return releases.length ? { kind: "whats-new", releases } : { kind: "hidden" };
}

export function WhatsNew() {
  const [state, setState] = useState<State>({ kind: "hidden" });
  const [tour, setTour] = useState(false);

  useEffect(() => {
    if (APP_RELEASE === "0.0.0") return; // outside a real build
    let active = true;
    void decide().then((next) => active && setState(next));
    return () => {
      active = false;
    };
  }, []);

  if (state.kind === "hidden") return null;

  const dismiss = () => {
    markSeen(APP_RELEASE);
    // Someone returning doesn't need the welcome as well.
    if (readWelcome() !== "done") setWelcome("done");
    setState({ kind: "hidden" });
  };

  const { releases } = state;
  const [latest, ...older] = releases;
  const includesMajor = releases.some((release) => release.kind === "major");

  if (isContentOnly(releases)) {
    return (
      <aside aria-label="New content" className="border-b border-line bg-surface px-4 py-2.5 sm:px-6 lg:px-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="flex items-start gap-2 text-sm text-fg">
            <BookOpenText aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
            <span>
              <strong className="font-semibold">New content in {latest.version}:</strong> {latest.title}.
            </span>
          </p>
          <Button size="sm" variant="ghost" onClick={dismiss}>
            Got it
          </Button>
        </div>
      </aside>
    );
  }

  return (
    <aside aria-labelledby="whats-new-heading" className="px-4 pt-4 sm:px-6 lg:px-10">
      <div className="motion-reveal mx-auto max-w-6xl rounded-2xl border border-accent/40 bg-surface p-5 shadow-soft sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-accent uppercase">
              <Sparkles aria-hidden className="size-3.5" />
              What&rsquo;s new
            </p>
            <h2 id="whats-new-heading" className="mt-1.5 font-serif text-xl leading-snug text-fg">
              Gospel Labs has been updated to {APP_RELEASE}
            </h2>
            <p className="mt-1 text-sm text-muted">Here&rsquo;s what changed since your last visit.</p>
          </div>
          <button
            type="button"
            aria-label="Dismiss what’s new"
            onClick={dismiss}
            className="-mt-1 -mr-1 flex size-11 shrink-0 items-center justify-center rounded-lg text-subtle hover:bg-surface-raised hover:text-fg"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>

        <ReleaseList releases={[latest]} className="mt-4" />
        {older.length > 0 && (
          <Disclosure summary={`Earlier: ${older.map((release) => release.version).join(", ")}`} variant="plain" className="mt-3">
            <ReleaseList releases={older} className="mt-2 pb-1" />
          </Disclosure>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button onClick={dismiss}>Got it</Button>
          {includesMajor && (
            <Button variant="secondary" onClick={() => setTour(true)}>
              Take a quick tour
            </Button>
          )}
        </div>
      </div>
      <TourDialog open={tour} onClose={() => setTour(false)} />
    </aside>
  );
}
