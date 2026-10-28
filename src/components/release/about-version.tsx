"use client";

/**
 * Settings › About: the running version (and what each of its four numbers means), the build, every release's
 * changes, the tour on request, and credits for the paintings.
 */
import { Compass, ExternalLink } from "lucide-react";
import { useState } from "react";
import { SettingsGroup } from "@/components/settings/settings-page";
import { Button } from "@/components/ui/button";
import { Disclosure } from "@/components/ui/disclosure";
import { displayVersion, parseVersion } from "@/domain/changelog";
import { APP_RELEASE, APP_VERSION } from "@/lib/app-version";
import { ARTWORKS } from "@/lib/art";
import { CHANGELOG } from "@/lib/release-state";
import { ReleaseList } from "./release-list";
import { TourDialog } from "./tour-dialog";

/**
 * What each number in MAJOR.MINOR.CONTENT.PATCH means, for learners (docs/VERSIONING.md). The first number that
 * changes also decides how Gospel Labs tells you about a release.
 */
const VERSION_PARTS = [
  { name: "Major", meaning: "A new look or a new way to study. You’ll see what’s new, with a tour." },
  { name: "Update", meaning: "New features and changes you’ll notice. You’ll see what’s new." },
  { name: "Content", meaning: "Investigations, passages, or Connect sessions added, revised, or corrected. You’ll get a one-line note." },
  { name: "Fix", meaning: "A small repair, made quietly. It’s listed here, and nowhere else." },
] as const;

export function AboutVersion() {
  const [tour, setTour] = useState(false);
  const [latest, ...older] = CHANGELOG.releases;
  const parts = parseVersion(APP_RELEASE) ?? [0, 0, 0, 0];
  return (
    <>
      <section aria-labelledby="about-version" className="flex flex-col gap-4">
        <div>
          <h2 id="about-version" className="text-heading text-fg">
            Gospel Labs {displayVersion(APP_RELEASE)}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Version <span className="tabular-nums">{APP_RELEASE}</span> · build <span className="tabular-nums">{APP_VERSION}</span>
          </p>
        </div>
        <p className="text-[0.9375rem] leading-relaxed text-muted">
          A version has four numbers. When one goes up, the numbers after it go back to 0.
        </p>
        <ol aria-label={`The four numbers in ${APP_RELEASE}`} className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
          {VERSION_PARTS.map((part, index) => (
            <li key={part.name} className="flex items-start gap-3">
              <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-surface-sunken font-serif text-xl text-fg tabular-nums">
                {parts[index]}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-fg">
                  {part.name}
                  <span className="sr-only">: {parts[index]}.</span>
                </span>
                <span className="block text-sm leading-relaxed text-muted">{part.meaning}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <SettingsGroup title="What’s new">
        <ReleaseList releases={[latest]} headingLevel="h3" />
        {older.length > 0 && (
          <Disclosure summary="Earlier releases" variant="plain" className="mt-3">
            <ReleaseList releases={older} className="mt-2" headingLevel="h3" />
          </Disclosure>
        )}
        <Button variant="secondary" onClick={() => setTour(true)} className="mt-6">
          <Compass aria-hidden />
          Take a quick tour
        </Button>
        <TourDialog open={tour} onClose={() => setTour(false)} finishLabel="Done" />
      </SettingsGroup>
    </>
  );
}

/** Every painting in the app, credited as its source gives it, with a link to the reproduction used. */
export function ArtCredits() {
  if (ARTWORKS.length === 0) return <p className="text-sm text-muted">No paintings yet.</p>;
  return (
    <ul className="flex flex-col divide-y divide-line border-y border-line">
      {ARTWORKS.map((artwork) => (
        <li key={artwork.slug} className="py-3">
          <p className="font-serif text-base text-fg italic">{artwork.title}</p>
          <p className="text-sm text-muted">
            {[artwork.artist, artwork.year, artwork.institution].filter(Boolean).join(" · ")}
          </p>
          <a
            href={artwork.source}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 inline-flex min-h-11 items-center gap-1.5 text-sm text-accent hover:underline sm:min-h-0 sm:py-1"
          >
            {artwork.license} · Wikimedia Commons
            <ExternalLink aria-hidden className="size-3.5" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
