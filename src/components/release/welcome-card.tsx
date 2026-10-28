"use client";

/**
 * The welcome for someone new to Gospel Labs, at the top of the dashboard
 * until they dismiss it: a short tour, a choice of theme, the version they're
 * using, and how to report a problem. Returning learners never see it; they
 * get What's new instead (see whats-new.tsx, which decides who is new).
 */
import { Bug, Compass, X } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { LookChoice } from "@/components/settings/theme-selector";
import { Button } from "@/components/ui/button";
import { displayVersion } from "@/domain/changelog";
import { APP_RELEASE } from "@/lib/app-version";
import { feedbackMailto } from "@/lib/feedback";
import { readWelcome, setWelcome, subscribeToReleaseState } from "@/lib/release-state";
import { TourDialog } from "./tour-dialog";

export function WelcomeCard() {
  const welcome = useSyncExternalStore(subscribeToReleaseState, readWelcome, () => null);
  const [tour, setTour] = useState(false);

  if (welcome !== "pending") return null;

  const done = () => {
    setWelcome("done");
    // The card, and the button that was used, are about to go: keep keyboard and screen-reader users on the
    // page by moving focus to its heading instead of letting it fall back to the document.
    requestAnimationFrame(() => {
      const heading = document.getElementById("dashboard-title");
      if (!heading) return;
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    });
  };

  return (
    <section aria-labelledby="welcome-heading" className="motion-reveal rounded-xl border border-line-strong bg-surface p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id="welcome-heading" className="font-serif text-2xl leading-snug text-fg">
            Welcome to Gospel Labs
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Study real gospel questions with the scriptures, come to know Jesus Christ a little better, and keep what you
            discover. There&rsquo;s no account, and everything stays private on this device.
          </p>
        </div>
        <button
          type="button"
          aria-label="Close the welcome"
          onClick={done}
          className="-mt-1 -mr-1 flex size-11 shrink-0 items-center justify-center rounded-lg text-subtle hover:bg-surface-raised hover:text-fg"
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button onClick={() => setTour(true)}>
          <Compass aria-hidden />
          Take a quick tour
        </Button>
        <Button variant="ghost" onClick={done}>
          Start studying
        </Button>
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <LookChoice />
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-xs leading-relaxed text-subtle sm:flex-row sm:items-center sm:justify-between">
        <p>
          You&rsquo;re using Gospel Labs {displayVersion(APP_RELEASE)}.{" "}
          <Link href="/settings/about" className="text-accent underline underline-offset-2 hover:text-accent-strong">
            What&rsquo;s in this version
          </Link>
        </p>
        <p className="flex items-center gap-1.5">
          <Bug aria-hidden className="size-3.5" />
          Something not working?{" "}
          <a href={feedbackMailto("bug")} className="text-accent underline underline-offset-2 hover:text-accent-strong">
            Report a bug
          </a>
          <span className="sr-only">(opens your email app)</span>
        </p>
      </div>

      <TourDialog open={tour} onClose={() => setTour(false)} onFinish={done} />
    </section>
  );
}
