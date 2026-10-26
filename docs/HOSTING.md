# Hosting Gospel Labs

Gospel Labs is a static website. `npm run build` exports plain HTML, JavaScript, CSS, and images to `out/`; there is no server-side code, database, account system, or environment variable. In production, Caddy on Atlas (a self-hosted server) serves those files at <https://gospellabs.softlockedlive.com>.

## Where user data lives

Investigations, including their evidence, claims, connections, discoveries, reflections, challenge responses, and trail notes, are stored only in each visitor's browser (IndexedDB), on their own device. They are never uploaded to Atlas: the server only hands out the app's files.

That means:

- Deploying, rolling back, or rebuilding Atlas can't delete anyone's investigations, and Atlas holds no copy to restore them from. Users protect their own data with **Settings › Your data › Export backup**.
- Data belongs to the browser *and* the address. The same browser sees different (empty) data on `localhost`, and someone who clears this site's data in their browser deletes their investigations.
- Rolling back to an older version of the app *can* affect how that data is handled; see [Rolling back](#rolling-back).

## Build and test

Requirements: Node.js 22 and npm 10 or newer.

```bash
npm ci                 # install exactly what package-lock.json lists
npm run lint
npm run typecheck
npm test               # unit and integration tests
npm run build          # writes the site to out/
npm run test:e2e       # desktop and mobile Chromium against out/ (build first)
npm start              # preview out/ at http://localhost:3000
```

`npm start` (`scripts/serve-out.mjs`) serves `out/` the way Caddy does: `/questions` finds `questions.html`, unknown paths get the app's `404.html`, and every response carries the production security headers and `Cache-Control: no-cache`, from [`scripts/security-headers.mjs`](../scripts/security-headers.mjs). The end-to-end tests therefore run under the real Content-Security-Policy. If you change the headers on Atlas, change that file too.

Firefox and WebKit are opt-in for the end-to-end tests: `E2E_BROWSERS=firefox,webkit npm run test:e2e`, after `npx playwright install firefox webkit`. On distributions Playwright doesn't list yet, add `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64` to both commands. WebKit also needs system libraries (`sudo npx playwright install-deps`).

Each build is stamped with its UTC build time (for example `20261020221921`). Settings › Feedback shows it, the service worker uses it to replace its caches, and it's published as [`/version.json`](#updates-and-the-version-manifest) so open copies of the app notice a new deployment.

## Deploying

```bash
npm run deploy
```

[`scripts/deploy.sh`](../scripts/deploy.sh):

1. Builds a fresh `out/`, and stops if the build didn't produce `out/index.html`.
2. Streams the files over SSH to Atlas, into a temporary folder next to the live site.
3. Swaps the folders: the live site becomes the previous build (only one previous build is kept), and the new upload becomes live. Visitors never see a half-uploaded site.
4. Checks that the home page answers `200`.

It needs SSH access to Atlas under the host name used in the script; that access is configured on the deploying computer, not in this repository.

Before deploying:

- Commit first. The script deploys the working tree as it is (it only warns about uncommitted changes), and the commit it prints describes the build only when the tree is clean.
- Run the checks above, including `npm run test:e2e`.
- If the release changes stored data or the backup format, confirm that older records and backups still load (the compatibility tests in `src/persistence/` cover this), and read [Rolling back](#rolling-back) before you need it.

After deploying, check the live site from your computer:

```bash
npm run verify:production
```

It's read-only. It checks the security headers against `scripts/security-headers.mjs`, that `/version.json` reports the build in your `out/` and isn't cached, that `/sw.js` loads, that clean URLs work, and that unknown paths get the app's 404 page. Then open the site and check that Settings › Feedback shows the new build time.

Open copies of the app notice the new build within minutes (see below) and offer to update. Installed copies also update on their next visit while online: pages are fetched from the network first, and the new service worker replaces the old caches.

## Updates and the version manifest

`/version.json` is a static file in every build (`src/app/version.json/route.ts`) holding that build's identifier, the same one compiled into the app. An open copy of the app reads it when it starts, when its tab is shown again, when the connection returns, and every 30 minutes. If it differs, the app shows "A new version of Gospel Labs is available." **Update now** saves all pending edits first and reloads only if everything was saved; if a form is half-filled, it says so and lets the user finish it or explicitly discard it.

The manifest must never be served stale. Four things make sure of that:

- Caddy sends `Cache-Control: no-cache` for it.
- The app requests it with a unique query string and `cache: "no-store"`, so neither the browser cache nor an edge cache keyed on the URL can answer.
- The service worker never intercepts it.
- `npm run verify:production` checks its caching after each deploy.

From 1.1 on, three more protections apply:

- Each saved investigation is stamped with the record format that wrote it (`dataVersion`; currently 2).
- A tab running an older version refuses to save over a record stamped by a newer one, and asks the user to reload instead.
- Raise `RECORD_DATA_VERSION` in `src/domain/investigation.ts` in any release that stores data an earlier version would damage when saving (for example, a new field inside evidence cards).

### Rolling out 1.1 over 1.0

Version 1.0 has no update check, and no later release can change code that's already running in someone's tab. A 1.0 tab left open across the deployment keeps running 1.0 until it's reloaded. Moving to a page it hasn't loaded yet may also bring in 1.1, because its old files are no longer on the server, but that hasn't been verified. If such a tab opens an investigation after 1.1 added connections, discoveries, reflections, challenge responses, or trail notes to it, and the user edits it there, 1.0 saves it without them. 1.0 also refuses version 2 backups instead of misreading them.

To keep that window small:

1. Deploy at a quiet time, and tell anyone you know is using the app to reload or close it afterwards.
2. Don't announce the new features until the deployment is verified, so nobody adds 1.1 data while a 1.0 tab is still open.
3. Ask users to export a backup before and after the update (Settings › Your data), so they hold a copy in each format.
4. Once 1.1 is live, don't roll back to 1.0 (see below).

From 1.1 onward, these risks are handled in the app: older tabs are told about updates, keep data they don't recognise, and refuse to save over newer records.

### Rolling out 2.0 over 1.1

2.0 adds four IndexedDB tables (database version 2) and never changes 1.x research-notebook records, which keep `RECORD_DATA_VERSION` 2. Open 1.1 tabs see the update notice within minutes, and keep working on research notebooks meanwhile. Two caveats while a 1.1 tab is still open:
- its "Delete all data" and replace-import clear only research notebooks, not 2.0 study data;
- 1.1 refuses version 3 backups as "made by a newer version", rather than dropping data.

Before the 2.0 deployment, the live 1.1 build was also copied on Atlas to a dated, never-served folder, so it survives later deploys (which keep only one `.gospellabs-previous`):

```bash
ssh atlas 'cd /srv/www && cp -a gospellabs.softlockedlive.com .gospellabs-1.1-20261021044420'
```

To roll back to 1.1 from that copy (data-safe: 1.1 opens the version 2 database and ignores the study tables):

```bash
ssh atlas 'cd /srv/www && test -d .gospellabs-1.1-20261021044420 \
  && mv gospellabs.softlockedlive.com .gospellabs-rolled-back \
  && cp -a .gospellabs-1.1-20261021044420 gospellabs.softlockedlive.com'
```

Or rebuild it from git: `git switch --detach v1.1.0 && npm ci && npm run deploy`. Study data made in 2.0 stays in each browser and reappears if 2.0 is redeployed.

## Rolling back

The previous build stays on Atlas next to the live site as `.gospellabs-previous`. Folders whose names start with a dot are never served. To put it back:

```bash
ssh atlas 'cd /srv/www && test -d .gospellabs-previous \
  && mv gospellabs.softlockedlive.com .gospellabs-rolled-back \
  && mv .gospellabs-previous gospellabs.softlockedlive.com'
```

The `test -d` guard means nothing moves if there is no previous build. To undo the rollback, swap back:

```bash
ssh atlas 'cd /srv/www && test -d .gospellabs-rolled-back \
  && mv gospellabs.softlockedlive.com .gospellabs-previous \
  && mv .gospellabs-rolled-back gospellabs.softlockedlive.com'
```

The next `npm run deploy` replaces `.gospellabs-previous` as usual. It doesn't touch `.gospellabs-rolled-back`; delete that folder by hand once you no longer need it.

Only one previous build is kept. To go back further, or to redeploy any specific version, check out that commit and deploy it:

```bash
git switch --detach <commit>
npm ci
npm run deploy
git switch -          # return to your branch
```

Browsers pick up a rollback like any other deployment: the restored build has a different build time, so installed copies switch to it on their next visit.

### Rollbacks and saved data

Rolling back changes only the app's files, but the older app then reads and saves data written by the newer one:

- **Back to 1.1 or later:** safe for data, including from 2.0 (1.1 opens 2.0's version 2 database; tested). From 1.1 on, the app keeps top-level fields it doesn't recognise when it saves an investigation. If the newer release raised `RECORD_DATA_VERSION`, investigations it saved open with a "saved by a newer version" notice in the older one and can't be edited until you fix forward. Nothing is overwritten.
- **Back to 1.0** (the first build on Atlas): **avoid this once 1.1 has been live.** 1.0 drops evidence connections, saved discoveries, Come unto Christ reflections, challenge responses, and discovery-trail notes from any investigation it saves, and refuses backups in format version 2. Fix forward instead. If you must roll back to 1.0, do it immediately after a bad deploy, before people have used the new features.

## How Atlas serves the site

Caddy serves the folder from Atlas's web root. Its configuration lives in Atlas's Caddyfile, not in this repository. The Gospel Labs site block:

- **Clean URLs:** maps `/questions` to `questions.html` (`try_files {path} {path}.html`).
- **404 page:** answers unknown paths with the app's own `404.html`.
- **Security headers:** adds `Content-Security-Policy`, which allows only same-origin scripts, styles, fonts, images, and connections, plus inline scripts for Next.js and the theme script. It also adds `Referrer-Policy: no-referrer`, `Permissions-Policy`, `X-Content-Type-Options: nosniff`, and `X-Frame-Options`.
- **Caching and compression:** sends `Cache-Control: no-cache`, so browsers check for updates on each visit; the service worker provides offline copies. Responses are compressed.
- **Hidden files:** hides dotfiles, so earlier builds kept next to the site are never served.

HTTPS is handled in front of Caddy. Because the security headers live in Caddy, changing them means editing the Gospel Labs block of the Caddyfile on Atlas and reloading Caddy (and updating `scripts/security-headers.mjs` to match).

### What the edge in front of Caddy changes

The public site is reached through Cloudflare, which, as of 1.1, changes three things:

- **Static-file caching:** it caches `.js` and `.svg` files at the edge and serves them with `Cache-Control: max-age=14400` (four hours) instead of Caddy's `no-cache`. That's harmless for build files, whose names change with every build, and for the service worker, which the app registers under a new URL for every build (`/sw.js?v=<build>`) and which browsers fetch past the HTTP cache when checking for updates. HTML pages, the manifest, and `/version.json` aren't affected.
- **Network Error Logging:** it adds `NEL`/`Report-To` headers, which ask browsers to send connection-error reports to Cloudflare. That traffic is outside the app's control and its Content-Security-Policy; if you want none, turn off Network Error Logging in the Cloudflare dashboard.
- **No HSTS:** no `Strict-Transport-Security` header is sent. Consider enabling HSTS in Cloudflare once you're sure the site will stay HTTPS-only.

`npm run verify:production` reports all three as warnings.
