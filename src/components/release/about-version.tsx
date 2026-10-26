"use client";

/** Settings › About: the running version and build, every release's changes, and the tour on request. */
import { Compass } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Disclosure } from "@/components/ui/disclosure";
import { APP_RELEASE, APP_VERSION } from "@/lib/app-version";
import { CHANGELOG } from "@/lib/release-state";
import { ReleaseList } from "./release-list";
import { TourDialog } from "./tour-dialog";

export function AboutVersion() {
  const [tour, setTour] = useState(false);
  const [latest, ...older] = CHANGELOG.releases;
  return (
    <div className="flex flex-col gap-5">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted">Version</dt>
        <dd className="font-medium text-fg">{APP_RELEASE}</dd>
        <dt className="text-muted">Build</dt>
        <dd className="font-mono text-xs leading-5 text-fg">{APP_VERSION}</dd>
      </dl>
      <p className="text-xs leading-relaxed text-subtle">
        Version numbers have three parts: a major update, improvements and fixes, and new content. So 2.1.0 brings
        improvements to the 2.0 redesign, and a release like 2.1.1 would only add content.
      </p>
      <div>
        <h3 className="text-sm font-semibold text-fg">What&rsquo;s new</h3>
        <ReleaseList releases={[latest]} className="mt-3" headingLevel="h4" />
        {older.length > 0 && (
          <Disclosure summary="Earlier releases" variant="plain" className="mt-3">
            <ReleaseList releases={older} className="mt-2" headingLevel="h4" />
          </Disclosure>
        )}
      </div>
      <div>
        <Button variant="secondary" onClick={() => setTour(true)}>
          <Compass aria-hidden />
          Take the tour
        </Button>
      </div>
      <TourDialog open={tour} onClose={() => setTour(false)} />
    </div>
  );
}
