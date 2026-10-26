# Versioning

Gospel Labs versions are **MAJOR.MINOR.CONTENT**. This is the owner's rule.

| Part | Raise it for | Example |
| --- | --- | --- |
| **MAJOR** | A major update that changes how Gospel Labs works or looks as a whole | 2.0.0, the 2.0 redesign |
| **MINOR** | Bug fixes and general changes to the app | 2.1.0: onboarding, What's new, and a fix |
| **CONTENT** | Content uploads only: new or revised investigations, passages, attributes, Connect sessions, or corrections to content. No change to how the app works | 2.1.1 |

When a number goes up, every number after it resets to 0. A release with both app changes and content is a MINOR release.

## Where the version lives

- **`package.json` `version`** is the only place the number is set. `next.config.ts` passes it to the app as `NEXT_PUBLIC_APP_RELEASE` (`APP_RELEASE` in `src/lib/app-version.ts`), and the app shows it in Settings › About and the welcome card, and includes it in bug-report emails.
- **`src/content/changelog.json`** lists every release, newest first, with its date, kind (`major`, `minor`, or `content`, which must match which number changed), a short title, and 1–8 highlights written for learners. Its newest entry must match `package.json` (enforced by `src/domain/changelog.test.ts`). It drives:
  - **What's new**, shown to returning learners after an update: every release since the one they last saw. If every unseen release is `content`, they get a one-line note instead of the full card.
  - **The update notice** in open tabs: `/version.json` publishes the release, its title, and its first three highlights.
  - **Settings › About**: the version, the build, and the full history.
- **The git tag** is `v` + the version (`v2.1.0`), on the commit that is deployed.
- **The build id** (`APP_VERSION`, the UTC build time) is separate. It identifies each deployment for the update check and the service worker, and changes on every build, even a redeploy of the same version.

## Making a release

1. Decide the kind (above) and bump `version` in `package.json`, and the two `version` fields at the top of `package-lock.json`.
2. Add an entry at the top of `src/content/changelog.json`: plain words, written for learners, no internal detail.
3. `npm test` (checks the changelog against `package.json`), plus the usual checks: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:e2e`, and `npm run verify:study` for content changes.
4. Commit, then tag: `git tag -a vX.Y.Z -m "Gospel Labs X.Y.Z"`.
5. Deploy and push only when the owner says so (see [HOSTING.md](HOSTING.md)).

## Returning and new learners

Each device remembers the last version it saw (`gospel-labs:last-seen-version` in localStorage, from 2.1 on):
- **Returning learners** see What's new for every release since then. Devices from before 2.1 have nothing recorded, so the version is inferred from what's stored there:
  - any 2.0 study data or study preferences → 2.0.0;
  - only 1.x research notebooks or a chosen theme → 1.1.0, so they also see the 2.0 notes.
- **New learners** (nothing stored) get the welcome card on the dashboard instead (a tour, a theme choice, the version, and how to report a bug), never What's new.
