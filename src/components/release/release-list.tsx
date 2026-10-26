/** Releases with what changed in each, newest first. Used by What's new and Settings › About. */
import { RELEASE_KIND_LABELS, type Release } from "@/domain/changelog";
import { cn } from "@/lib/cn";

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

export const formatReleaseDate = (date: string) => dateFormatter.format(new Date(`${date}T00:00:00Z`));

export function ReleaseList({ releases, className, headingLevel: Heading = "h3" }: { releases: readonly Release[]; className?: string; headingLevel?: "h3" | "h4" }) {
  return (
    <ol className={cn("flex flex-col gap-5", className)}>
      {releases.map((release) => (
        <li key={release.version}>
          <Heading className="text-sm font-semibold text-fg">
            {release.version} · {release.title}
          </Heading>
          <p className="mt-0.5 text-xs text-subtle">
            {RELEASE_KIND_LABELS[release.kind]} · {formatReleaseDate(release.date)}
          </p>
          <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-muted marker:text-subtle">
            {release.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
