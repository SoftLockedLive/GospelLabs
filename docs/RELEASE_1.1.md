# Gospel Labs 1.1: release readiness

Prepared 20 October 2026 on branch `v1.1-guided-discovery` and committed there with the release candidate. Nothing has been merged, pushed, or deployed. Production runs 1.0.

## Verdict

**Release candidate approved for final preparation; not yet authorized for deployment.** Every automated check passes, nothing in the code blocks the release, and the remaining risks are known and documented below. When deployment is authorized:

1. Follow the deployment sequence at the end of this report, including the steps that protect tabs still running 1.0.
2. Do the manual device checks, since Safari/iOS and real phones haven't been tested.

## What 1.1 adds

| Area | Change |
| --- | --- |
| Research | Organized into tabs: **Discover** (a curated question's trail), **Challenges**, **Evidence**, and **Connections**, each with a count or progress. Switching never loses unfinished input, and the last tab is remembered per investigation. |
| Research challenges | 23 data-driven prompts (Observe, Connect, Compare, Question, Apply) with autosaved, editable responses. Never graded. |
| Discovery trails | Guided, any-order study steps for curated questions, separating what passages **state** from what's **open to interpretation**, with notes and explored marks. One trail ships: "How could Jesus Christ forgive sins before the Atonement?" Its 7 passage links and 24 quotations are verified against ChurchofJesusChrist.org. |
| Evidence connections | The user links two evidence cards as supports, challenges, raises a question about, or connects to, with an optional explanation. One connection per pair of cards; deleting a card removes its connections, with Undo. |
| Discovery highlights | "Save discovery" from any section (sticky beside the steps); discoveries can link evidence and are reviewed at the top of Conclusion. |
| Come unto Christ | An optional reflection card in Conclusion with three prompts. Never required, scored, or evaluated. |
| Layout | Conclusion and Analysis use the full content width; their evidence reference became a collapsible panel. Section steps form a column only from 1280px, and sit in a sticky top bar below that. |
| Data protection | Changes from another tab are noticed immediately; conflicting edits are never silently overwritten. Edits that a closing page couldn't save are restored from a safety copy. Tabs running an older version won't save over newer data. |
| Updates | `/version.json` lets open copies notice a new deployment; "Update now" saves everything first. |
| Other | A feedback section (gospellabs@proton.me). Self-hosting documentation for Atlas, with Vercel removed. A local server that applies the production security headers. `npm run verify:production`. |

## Data compatibility

- **Investigations stored by 1.0** open unchanged, with every new field empty. No database migration runs, and nothing is rewritten until the user edits.
- **Backups** are format version 2, a format never distributed before this release.
  - Version 1 files from 1.0 import with every field intact.
  - Version 2 files from each pre-release build import too, with their challenge responses, trail notes, and connections.
  - 1.0 refuses version 2 files and asks for an update, rather than dropping new fields.
- **New data** is stored in new fields with defaults. Investigations, evidence, claims, and existing notes keep their ids and content. The old "Reflection" notes now appear as "Other reflections".
- **Forward protection (from 1.1 on):**
  - Saves stamp a record format (`dataVersion: 2`), and this version won't save over a record stamped higher.
  - Top-level fields it doesn't recognise are kept.
  - Exports are written exactly as stored.
  - Imports skip records from newer versions, and merges never replace them.
- **Validation:** imports reject an investigation whose connections, discoveries, or claims point at missing evidence, or that has self-connections or duplicate pairs. The preview names the investigation and the reason; nothing is silently repaired.

Covered by unit tests with hand-written 1.0 records and backups and fixtures from each pre-release build, and by end-to-end tests that load 1.0 data in the browser.

## Test results

| Check | Result |
| --- | --- |
| ESLint, TypeScript | Clean |
| Unit and integration tests (Vitest) | 324 passed |
| Production build (`output: "export"`) | Passed; 25 static routes including `/version.json` |
| End-to-end, desktop Chromium | 25 passed |
| End-to-end, mobile Chromium (Pixel 7) | 25 passed |
| End-to-end, Firefox 148 | 24 passed, 1 skipped (offline; see browser coverage) |
| New end-to-end specs repeated 3× in Chromium and Firefox | 63 of 63 passed |
| Accessibility audit (axe: WCAG 2.2 AA and best practices) | 96 page states, dark and light themes, 320/1024/1280px: 0 violations, no horizontal overflow, no undersized targets |
| Content-Security-Policy | Every end-to-end test and audit ran under the production policy: no violations, no requests to other sites |
| Links and quotations (`npm run verify:references`) | 54 of 54 links and 24 of 24 trail quotations verified |
| Production check against live 1.0 | Headers match; `/version.json` missing as expected until 1.1 is deployed |

End-to-end coverage includes:

- the full investigation lifecycle;
- Research tabs (keeping unsaved input, keyboard, memory);
- trails, challenges, connections, discoveries, and reflection;
- two tabs editing at once;
- the update notice, which saves before reloading, and the check that the built `/version.json` matches the running app, never comes from a cache, and goes past the service worker;
- edits made just before leaving a page;
- export, import, merge, and replace, including a full round trip: a 1.0 backup imported, every 1.1 feature used on it, exported, wiped, re-imported, and re-exported identically;
- damaged and newer backups;
- 1.0 data;
- offline use (Chromium).

## Browser coverage

| Browser | Status |
| --- | --- |
| Chromium / Chrome, desktop | Full end-to-end suite and audits pass |
| Chrome on Android (Pixel 7 emulation) | Full suite passes; not tested on a physical device |
| Firefox 148, desktop | Full suite passes except offline. Playwright can't simulate offline service-worker traffic in Firefox, so offline use there is unverified. Testing found and fixed a Firefox-only loss of edits made just before a page closed. |
| Safari / WebKit, including iOS | **Not tested.** Playwright's WebKit needs system libraries that weren't installed (`sudo npx playwright install-deps`). |
| Screen readers | **Not tested** with VoiceOver or NVDA. Roles, names, live regions, and focus management were checked by axe, Playwright accessibility queries, and keyboard tests. |

## Hosting considerations

- **Hosting setup:** static export served by Caddy on Atlas, with Cloudflare in front. No server code, database, or environment variables.
- **Security headers:** Content-Security-Policy, Referrer-Policy, Permissions-Policy, nosniff, and X-Frame-Options come from Caddy and match `scripts/security-headers.mjs`. The policy supports everything the app does, including `/version.json`, blob downloads for export, mailto links, and the service worker.
- **`/version.json` freshness:** it can't be served stale. Caddy sends `no-cache`, the app adds a unique query string and `no-store`, and the service worker never caches it.
- **External links:** links to ChurchofJesusChrist.org open in a new tab with `rel="noopener noreferrer"`, and the site sends `Referrer-Policy: no-referrer`.
- **Cloudflare's own behavior (decisions for you; nothing in the app depends on them):**
  - **Edge caching:** `.js` and `.svg` files are cached at the edge with `max-age=14400`. Harmless here: build files are content-hashed, and the service worker gets a new URL each build.
  - **Network Error Logging:** `NEL`/`Report-To` headers ask browsers to report connection errors to Cloudflare. Disable this in Cloudflare if you want no third-party reporting at all.
  - **No HSTS:** no `Strict-Transport-Security` header is sent. Consider enabling it.

## Backup and rollback risks

- **No server copy of anyone's data.** Investigations live only in each browser. Deploying or rolling back can't delete them, but nothing on Atlas can restore them either. Encourage users to export backups.
- **Tabs still running 1.0** at deployment time are the main risk.
  - 1.0 has no update check, and new code can't change a running 1.0 tab.
  - If such a tab opens an investigation after 1.1 added new data to it, and the user edits there, 1.0 saves it without the new data.
  - The window is small (a 1.0 tab left open, plus the same investigation used in 1.1 meanwhile), and the deployment sequence below reduces it.
- **Rolling back to 1.0 after 1.1 has been used is unsafe:** 1.0 drops the new data whenever it saves an investigation. Fix forward instead. `npm run deploy` keeps 1.0 as `.gospellabs-previous`, so a rollback is possible immediately after a bad deploy, before anyone uses the new features.
- **Rolling back from a future release to 1.1 is safe.** If that release raised `RECORD_DATA_VERSION`, its records open read-only in 1.1 until you fix forward; nothing is overwritten.

## Remaining known issues

- **Untested platforms:** Safari/iOS, physical Android and iOS devices, and screen readers (above).
- **Firefox offline:** offline behavior in Firefox is unverified because of the test tooling.
- **Safety-copy gap:** the safety copy needs `localStorage`. Where it's unavailable (some private modes), an edit made within a moment of closing a page can still be lost in Firefox.
- **No merging of concurrent edits:** edits in two tabs are detected and never silently overwritten, but they aren't merged; the user chooses a version.
- **Content-Security-Policy allows `'unsafe-inline'` scripts,** which the static export's inline Next.js scripts and the theme script need. All third-party requests are still blocked.
- **Small layout and feature limits:**
  - At 320px the current trail step's label in the step row shortens to a single letter (the full title is shown just below).
  - On phones, discoveries are reviewed by opening Conclusion; the "Review" shortcut appears only when the steps form a column (1280px and up).
  - One discovery trail so far.
  - One connection per pair of evidence cards.
- **Package version:** `package.json` still says `0.1.0`. The app identifies builds by build time, so this is cosmetic; bump it to `1.1.0` if you want the repository to say so.

## Recommended deployment sequence

Each step that changes GitHub or Atlas needs explicit authorization; none has been done.

1. **Review:** done. The release candidate is committed on `v1.1-guided-discovery`; `git log main..v1.1-guided-discovery` lists its commits.
2. **Commit:** done, on the branch.
3. **Verify from a clean install** (the end-to-end tests need Chromium: run `npx playwright install chromium` once, or set `CHROMIUM_PATH`):
   ```bash
   npm ci
   npm run lint && npm run typecheck && npm test
   npm run build && npm run test:e2e
   npm run verify:references
   ```
4. **Merge** into `main` (a fast-forward: `git switch main && git merge --ff-only v1.1-guided-discovery`), optionally tag `v1.1.0`, and push if you use GitHub as the source of truth.
5. **Prepare users:**
   - Export a backup of your own data from the live 1.0 site (Settings › Your data).
   - Pick a quiet time, and ask anyone you know is using the app to close it before the deployment and reload after.
6. **Deploy** from a clean `main`: `npm run deploy`.
7. **Verify production:** `npm run verify:production`. Every check should pass, and `/version.json` should report the build in your `out/`; the three Cloudflare warnings are expected.
8. **Check the live site by hand:**
   - Settings › Feedback shows the new build time.
   - Open an existing investigation; it opens unchanged.
   - Try each Research tab, save a discovery, and answer a reflection prompt.
   - Export a backup and confirm it says `"version": 2`.
9. **Check on devices:**
   - iPhone Safari: add to Home Screen, create an investigation, go offline, reopen.
   - An Android phone.
   - Firefox offline.
10. **Don't roll back to 1.0** once people have used 1.1. If something is wrong, fix forward. Rollback commands are in [HOSTING.md](HOSTING.md).
11. **On the next deployment,** keep a 1.1 tab open beforehand and confirm it shows "A new version of Gospel Labs is available" and updates without losing edits. That's the first time the update notice can be seen in production.
