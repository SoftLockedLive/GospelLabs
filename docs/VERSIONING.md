# Versioning

Gospel Labs versions are **MAJOR.MINOR.CONTENT.PATCH**. This is the owner's rule.

| Part | Raise it for | Example |
| --- | --- | --- |
| **MAJOR** | A major update that changes how Gospel Labs works or looks as a whole | 2.0.0, the 2.0 redesign |
| **MINOR** | Bug fixes and general changes to the app | 2.1.0: onboarding, What's new, and a fix |
| **CONTENT** | Content uploads only: new or revised investigations, passages, attributes, Connect sessions, or corrections to content. No change to how the app works | 2.2.1.0 |
| **PATCH** | A small one-off bug fix. Deployed quietly: learners get no What's new and no update notice, and it's listed only in Settings › About | 2.2.0.1: shorter quick studies |

When a number goes up, every number after it resets to 0. A release with both app changes and content is a MINOR release.

Releases up to 2.2.0 had three parts (MAJOR.MINOR.CONTENT). They keep their numbers, and a three-part number reads as PATCH 0 (2.2.0 is 2.2.0.0). Every release from 2.2.0.1 on has four parts; the changelog tests enforce it.

## Where the version lives

- **`package.json` `version`** is the only place the number is set. npm accepts the four-part number because the package is private and never published. `next.config.ts` passes it to the app as `NEXT_PUBLIC_APP_RELEASE` (`APP_RELEASE` in `src/lib/app-version.ts`), and the app shows it in Settings › About and the welcome card, and includes it in bug-report emails.
- **`src/content/changelog.json`** lists every release, newest first, with its date, kind (`major`, `minor`, `content`, or `patch`, which must match which number changed), a short title, and 1–8 highlights written for learners. Its newest entry must match `package.json` (enforced by `src/domain/changelog.test.ts`). It drives:
  - **What's new**, shown to returning learners after an update: every release since the one they last saw, except patches. If every unseen release is `content`, they get a one-line note instead of the full card. If only patches are unseen, they get nothing.
  - **The update notice** in open tabs: `/version.json` publishes the release, its title, and its first three highlights. A tab whose release differs from the deployed one only in PATCH shows no notice; the fix arrives the next time Gospel Labs loads. (Tabs still running 2.2.0 or earlier don't know this rule, so they show the notice, with the patch's own notes.)
  - **Settings › About**: the version, the build, and the full history, patches included.
- **The git tag** is `v` + the version (`v2.2.0.1`), on the commit that is deployed.
- **The build id** (`APP_VERSION`, the UTC build time) is separate. It identifies each deployment for the update check and the service worker, and changes on every build, even a redeploy of the same version.

## Making a release

1. Decide the kind (above) and bump `version` in `package.json`, and the two `version` fields at the top of `package-lock.json`.
2. Add an entry at the top of `src/content/changelog.json`: plain words, written for learners, no internal detail.
3. `npm test` (checks the changelog against `package.json`), plus the usual checks: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:e2e`, and `npm run verify:study` for content changes.
4. Commit, then tag: `git tag -a vW.X.Y.Z -m "Gospel Labs W.X.Y.Z"`.
5. Deploy and push only when the owner says so (see [HOSTING.md](HOSTING.md)).

## Returning and new learners

Each device remembers the last version it saw (`gospel-labs:last-seen-version` in localStorage, from 2.1 on):
- **Returning learners** see What's new for every release since then. Devices from before 2.1 have nothing recorded, so the version is inferred from what's stored there:
  - any 2.0 study data or study preferences → 2.0.0;
  - only 1.x research notebooks or a chosen theme → 1.1.0, so they also see the 2.0 notes.
- **New learners** (nothing stored) get the welcome card on the dashboard instead (a tour, a theme choice, the version, and how to report a bug), never What's new.
