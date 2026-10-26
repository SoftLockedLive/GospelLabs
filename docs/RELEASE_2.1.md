# Gospel Labs 2.1.0

A **minor** release (improvements and fixes) under the MAJOR.MINOR.CONTENT scheme in [VERSIONING.md](VERSIONING.md). Committed and tagged `v2.1.0`. **Not yet pushed or deployed**: waiting for the owner's go-ahead.

## What's in it

- **Version scheme.** MAJOR.MINOR.CONTENT, set only in `package.json`. Each release has an entry in `src/content/changelog.json`, and a test fails if the newest entry doesn't match `package.json`. The rule and the release steps are in [VERSIONING.md](VERSIONING.md).
- **What's new for returning learners.** A card at the top of whatever page they open first. It says Gospel Labs was updated and lists every release since the one this device last saw, until they dismiss it. If every unseen release is content-only, it's a one-line note instead. If one was a major update, the card offers the tour.
  - **How the device is recognized.** The last-seen version is recorded from now on (`gospel-labs:last-seen-version`). Devices from before 2.1 have nothing recorded, so the version is inferred from what's stored:
    - 2.0 study data or study preferences → 2.0, so they see 2.1;
    - only 1.x research notebooks or a chosen theme → 1.1, so they see 2.0 and 2.1.
- **Welcome for new learners.** On the dashboard, until dismissed: a short tour (Investigate, Scripture Explorer, Character of Christ, Connect with Christ, Notebook and Map, privacy), a theme choice, the version, and a "Report a bug" link that reuses the existing feedback email template. New learners never get What's new.
- **Settings › About.** The version and build, every release's changes, and the tour on request. Bug-report emails now include the release number as well as the build.
- **Update notice.** Open tabs that notice a deployment now name the new release and its first three highlights. `/version.json` publishes them; older tabs still read only `version`.
- **Fix: the Connect with Christ card on the dashboard.** Before, only its title opened the page. The card's link overlay was positioned against the heading instead of the card, and other parts of the card sat above it. Now tapping anywhere on the card opens `/connect`, like the other cards.

## Tests

- **Lint and typecheck:** clean.
- **Unit tests:** **1,421 passed**. New ones cover the changelog (newest entry matches `package.json`, kinds match version bumps, ordering), "what's new since" and content-only notes, inferring a returning device's version, and reading the richer `/version.json`.
- **Production build:** passes.
- **End-to-end (desktop and mobile Chromium):** **223 passed, 3 skipped (by design)**, including 22 new:
  - **`e2e/release-notes.spec.ts`:**
    - a new learner gets the welcome, tour (by keyboard), theme choice, version, and bug link, and never What's new;
    - someone returning from 1.1 sees the 2.1 and 2.0 notes on whatever page they open, until dismissed, and no welcome;
    - someone returning from 2.0 sees only 2.1;
    - recorded versions;
    - Settings › About;
    - axe: no violations on the welcome, tour, and What's new.
  - **`e2e/dashboard-cards.spec.ts`:** tapping the Connect with Christ, Scripture Explorer, and Character of Christ cards away from their titles opens their pages. This guards the Connect fix.
  - **`e2e/update-notice.spec.ts`:** the notice names the new release and lists its highlights.
- **Existing specs:** they now run as a learner already on this version (a default storage state in `playwright.config.ts`), so the new cards don't affect them.

## To release

When the owner approves, from `main`:

```bash
git push origin main v2.1.0
SSH_AUTH_SOCK=/run/user/1000/ssh-agent.socket npm run deploy   # the agent variable only for agent sessions
npm run verify:production
```

Then check on the live site:
- a fresh private window shows the welcome;
- a browser that used 2.0 shows What's new for 2.1.0.

Rollback: [HOSTING.md](HOSTING.md) (`.gospellabs-previous` will hold 2.0; 1.1 stays preserved).
