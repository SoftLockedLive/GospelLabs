import rawChangelog from "@/content/changelog.json";
import { changelogSchema } from "@/domain/changelog";
import { APP_RELEASE, APP_VERSION } from "@/lib/app-version";

/**
 * /version.json: the deployed build's identifier, exported as a static file.
 * Open copies of the app fetch it (never from a cache) to notice updates.
 * From 2.1 it also names the release and its main changes, so the update
 * notice can say what changed before the learner reloads. Older copies read
 * only `version`. Copies from 2.2.0.1 on show no notice for a patch; older
 * ones do, so a patch's notes are its own (not a release they already have).
 */
export const dynamic = "force-static";

export function GET() {
  const latest = changelogSchema.parse(rawChangelog).releases[0];
  return Response.json({
    version: APP_VERSION,
    release: APP_RELEASE,
    title: latest.title,
    highlights: latest.highlights.slice(0, 3),
  });
}
