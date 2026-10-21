# Gospel Labs

**Question. Study. Discover.**

Gospel Labs is a private, mobile-first research notebook for members of The Church of Jesus Christ of Latter-day Saints who want to study gospel questions carefully. Each investigation moves through five stages (Question, Hypothesis, Research, Analysis, Conclusion) that you can visit in any order. You gather evidence from scriptures and Church resources, link that evidence to the claims you make, and write your own conclusions.

Gospel Labs never provides doctrinal answers, grades conclusions, or claims religious authority. It is an independent study tool, not an official Church product.

See [PROJECT_SPEC.md](PROJECT_SPEC.md) for the full product specification.

## Features

- **Investigation workspace:** five freely navigable sections; optional subquestions and any number of hypotheses; evidence cards (create, edit, delete) with source, link, observation, relevance, and tags; claims in Analysis and Conclusion linked to evidence; user-controlled status (investigating, partially understood, concluded), with concluded investigations still editable; Undo for deletions.
- **Evidence connections:** in Research, connect two pieces of evidence and say how they relate (supports, challenges, raises a question about, or connects to), with an optional explanation. Each connection shows both cards joined by a labeled arrow, opens either card, and can be edited in place or deleted with Undo. Connections are only ever made by the user; Gospel Labs never creates or evaluates them. See [docs/EVIDENCE_CONNECTIONS.md](docs/EVIDENCE_CONNECTIONS.md).
- **Come unto Christ reflection:** an optional card in Conclusion with three prompts (what you've learned about Jesus Christ, what you'd like to understand better, and how it might influence the way you follow Him), plus your other reflections. Saved as you type; never required, scored, or evaluated, and it doesn't affect the investigation's status.
- **Discovery highlights:** "Save discovery" beside the section steps keeps an insight from any section, with a short title, the insight, and optional links to evidence. Discoveries gather at the top of Conclusion for review and can be edited or deleted with Undo. See [docs/REFLECTION_AND_DISCOVERIES.md](docs/REFLECTION_AND_DISCOVERIES.md).
- **Research challenges:** optional prompts in Research (Observe, Connect, Compare, Question, Apply) that suggest a way to look closer at any question. Ask for another, filter by type, and write a response that's saved with the investigation; reopen and edit any response later. Responses are never graded or required. Challenges are defined in JSON; see [docs/RESEARCH_CHALLENGES.md](docs/RESEARCH_CHALLENGES.md).
- **Discovery trails:** optional guided paths through specific passages for some curated questions, in Research. Each step gives a guiding question and passages to read, separates what the text **states** from what is **open to interpretation**, and has a place to record discoveries and mark the step explored. Steps can be taken in any order, the trail reopens where you left off, and it never supplies a conclusion. The first trail asks "How could Jesus Christ forgive sins before the Atonement?" through Mark 2, John 8, and Mosiah 3. See [docs/DISCOVERY_TRAILS.md](docs/DISCOVERY_TRAILS.md).
- **Research activities:** Research is organized into tabs: Discover (a question's discovery trail, when it has one), Challenges, Evidence, and Connections, each with its count or progress. Switching never loses unfinished input, actions that belong to another activity switch to it, and the last activity is remembered with the investigation.
- **Autosave:** every change is saved on the device as you type, including when you switch tabs, navigate away, or close the page. Investigations reopen at the section and activity you last used. If a browser drops the last save while a page is closing, a safety copy restores it next time.
- **Never silently overwritten:** an open investigation notices at once when another tab or window saves it, and offers to load the newer copy; with unsaved edits on both sides, the user chooses. A tab running an older version of the app won't save over data written by a newer one.
- **Update notice:** when a new version is deployed, open copies of the app say so, and "Update now" saves everything before reloading.
- **Question bank:** 13 curated questions with search, topic and difficulty filters, random selection, verified links to official Church scripture and Gospel Topics pages, and study prompts. Suggested references are starting points, never automatic evidence.
- **My Library:** search, filter by status, resume or reopen, preview evidence, and delete with confirmation.
- **Backups:** export everything as versioned JSON; import with merge or replace, with validation, a preview, and safeguards. See [docs/BACKUPS.md](docs/BACKUPS.md).
- **Installable and offline:** a Progressive Web App that keeps working without a connection after the first visit.
- **Accessible:** keyboard operable throughout, screen-reader labels and announcements, WCAG 2.2 AA contrast in dark and light themes, reduced-motion support.

## Privacy

- No accounts, analytics, advertising, tracking, cookies, AI, or cloud services.
- Investigations are stored only in this browser's IndexedDB. The theme choice is stored in `localStorage`.
- The app makes no requests to other sites. Fonts are bundled at build time, and a Content Security Policy (set by the server) limits scripts, styles, fonts, images, and connections to the app's own origin.
- To notice updates, open copies of the app read `/version.json` from their own site now and then (when opened, when the tab is shown again, and every 30 minutes). It sends nothing about the user.
- If a page closes before its last edits are saved, a temporary copy of those edits is kept in this browser's `localStorage` until it's saved.
- Links to ChurchofJesusChrist.org open in a new tab only when you choose them, and send no referrer.
- The only tool that contacts an external site is the developer script `npm run verify:references`, which never runs in the app.

## Getting started

Requirements: Node.js 22 and npm 10 or newer.

```bash
npm install
npm run dev          # http://localhost:3000
```

The service worker (offline support) is only active in production builds. To try the installable, offline app locally:

```bash
npm run build
npm start            # http://localhost:3000
```

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build |
| `npm start` | Serve the static build in `out/` the way it's served in production (`scripts/serve-out.mjs`) |
| `npm run deploy` | Build and publish to Atlas ([docs/HOSTING.md](docs/HOSTING.md)) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (run `build` or `dev` once first so route types exist) |
| `npm test` | Unit and integration tests (Vitest; IndexedDB via fake-indexeddb) |
| `npm run test:e2e` | End-to-end tests in Chromium, desktop and mobile (Playwright); run `npm run build` first |
| `npm run verify:production` | After a deployment: check the live site's security headers, update manifest, caching, clean URLs, and 404 page (read-only; needs network) |
| `npm run verify:references` | Check every question-bank and trail link, and every trail quotation, against ChurchofJesusChrist.org (needs network) |
| `npm run questions:schema` | Regenerate the question bank's JSON Schema after changing its Zod schema |

End-to-end tests need a Chromium browser: run `npx playwright install chromium` once, or set `CHROMIUM_PATH` to an existing Chromium or Chrome executable.

> **npm 9 note:** Debian's packaged npm 9.2 crashes when adding packages to this project (`Cannot read properties of null (reading 'edgesOut')`). Installing from the lockfile works. Use npm 10 or newer to add or update packages, for example `npx npm@10 install <package>`.

## Hosting

Gospel Labs is a static export served by Caddy on Atlas, a self-hosted server, at <https://gospellabs.softlockedlive.com>. There's no server-side code, database, or environment variable: `npm run build` writes the whole site to `out/`, and `npm run deploy` uploads it and swaps it in, keeping the previous build for a quick rollback. Security headers (Content-Security-Policy and others) are set by Caddy, not by this repository.

Investigations stay in each visitor's browser (IndexedDB) and are never uploaded, so deploying or rolling back can't delete them, and Atlas has no copy to restore.

See **[docs/HOSTING.md](docs/HOSTING.md)** for building, testing, deploying, rolling back, and how Atlas serves the site.

## Offline behavior

After one online visit, the service worker caches the app shell: the dashboard, question bank (including every question page), library, settings, the investigation editor, and the static files they need. Offline, you can open, edit, and create investigations, browse the question bank, and export or import backups.

- Links to ChurchofJesusChrist.org need a connection. Gospel Labs never caches other sites, and shows a notice while offline saying so.
- A page that was never cached shows an "isn't available offline" page instead of a browser error.
- Pages are fetched from the network first when online, so updates appear right away. The cache is the fallback.

## Adding questions, challenges, and trails

- **Questions:** edit [`src/data/question-bank.json`](src/data/question-bank.json); no code changes are needed. See [docs/QUESTION_BANK.md](docs/QUESTION_BANK.md) for the fields, rules, and how links are verified.
- **Research challenges:** edit [`src/data/research-challenges.json`](src/data/research-challenges.json). See [docs/RESEARCH_CHALLENGES.md](docs/RESEARCH_CHALLENGES.md) for the fields and writing guidelines.
- **Discovery trails:** edit [`src/data/discovery-trails.json`](src/data/discovery-trails.json). See [docs/DISCOVERY_TRAILS.md](docs/DISCOVERY_TRAILS.md) for the fields, the rules that keep text and interpretation apart, and how quotations are verified.

## Feedback

Bug reports and ideas go to **[gospellabs@proton.me](mailto:gospellabs@proton.me)**. In the app, **Settings › Feedback** opens your email app with a short template, and the error page links to the same address. Nothing is sent automatically, and investigations are never attached.

## Project structure

```
src/
  app/                        Routes (App Router); every page is exported as static HTML
    page.tsx                  Dashboard
    questions/, questions/[id]  Question bank and question pages
    library/                  My Library
    settings/                 Settings: appearance, backups, storage, privacy
    investigations/new/       New investigation (draft created in the browser)
    investigations/view/      Saved investigation (?id=…&section=…), loaded from IndexedDB
    offline/                  Shown for uncached pages while offline
    manifest.ts, apple-icon.png, icon.svg   PWA manifest and icons
  components/
    ui/                       Primitives: Button, Card, Field/Input, Badge, Dialog, EmptyState, …
    layout/                   App shell and navigation
    workspace/                Investigation editor, sections, evidence/, claims/, connections/,
                              discoveries/, reflection/, challenges/, trails/, undo, autosave status
    library/, dashboard/, questions/, settings/, investigations/, pwa/
  data/                       question-bank.json (and its generated JSON Schema), research-challenges.json,
                              discovery-trails.json
  domain/                     Pure logic and Zod schemas: investigation model and reducer,
                              evidence input, question bank, research challenges, discovery trails,
                              reflection prompts, filters, factory
  persistence/                Dexie database, repository, autosave controller, backups, React hooks
  lib/                        Utilities (ids, dates, routes, theme, downloads)
public/                       sw.js (service worker), PWA icons
e2e/                          Playwright end-to-end tests
scripts/                      deploy.sh, serve-out.mjs (local static server), security-headers.mjs,
                              verify-references.mjs, verify-production.mjs
docs/                         HOSTING.md, QUESTION_BANK.md, RESEARCH_CHALLENGES.md, DISCOVERY_TRAILS.md,
                              EVIDENCE_CONNECTIONS.md, REFLECTION_AND_DISCOVERIES.md, BACKUPS.md,
                              RELEASE_1.1.md (release readiness and deployment sequence)
```

### Architecture notes

- **Data model:** one self-contained IndexedDB record per investigation; evidence cards, claims, evidence connections, discoveries, challenge responses, trail notes, and reflections inside it reference each other by id. New data is added as new fields with defaults, so older records load without a migration, and fields added by newer versions are preserved rather than dropped. Zod schemas in `src/domain/investigation.ts` define the types and validate records on every read, write, and import.
- **State:** every change goes through a pure reducer (`src/domain/investigation-reducer.ts`) via React's `useReducer`; ids and timestamps are passed in, so operations are deterministic and unit-tested.
- **Persistence:** `src/persistence/investigation-repository.ts` validates data, maps browser storage failures to clear messages, refuses to overwrite changes made elsewhere, and runs multi-record operations in a single transaction. `src/persistence/autosave.ts` debounces and serializes saves independently of React.

## Testing

- **Unit and integration tests (Vitest, 280+):** the investigation reducer, schema and integrity rules (including malformed, orphaned, self-referencing, and duplicate connections), evidence input, question-bank and research-challenge validation, search, filters and random selection, persistence against a real IndexedDB implementation, autosave timing and conflicts, backup export/import round trips including transactional rollback, discovery-trail validation and progress, and compatibility with records and backups saved by Gospel Labs 1.0 and by pre-release 1.1 builds.
- **End-to-end tests (Playwright; desktop and mobile Chromium, plus Firefox on request):** run under the production security headers. Research activities (switching keeps unsaved input, counts, keyboard, remembered activity); edits in two tabs at once; the update notice; edits made just before leaving a page; create, edit, resume, conclude, and reopen; curated questions; discovery highlights (save from any section, title required, link evidence, review, edit, delete with Undo, evidence deletion and Undo, backup contents); Come unto Christ reflection (optional, autosaved, independent of status); evidence connections (create with validation, duplicate pairs blocked, connect from a card, edit in place, open a card, delete evidence or connections with Undo, backup contents); research challenges (respond, try another, filter, revisit and edit, undo a deletion); discovery trails (any-order steps, notes, explored marks, recording evidence, resuming, library progress, backup contents) and questions without trails; a 1.0 record and a 1.0 backup opening with all their data; delete confirmation; export, delete everything, and restore; replace with its safeguards; damaged and newer-version backups; feedback links; and full offline use.

## Known limitations

- **One browser, one device.** There is no sync. Use export and import to move investigations between browsers or devices.
- **Clearing site data deletes investigations.** Regular backups are the safeguard. The browser may grant "persistent storage" (Settings), but that is its decision.
- **Multiple tabs:** changes from another tab are noticed immediately, and conflicting edits are never overwritten silently, but they aren't merged either: the user chooses which version to keep.
- **Tabs left open from 1.0:** version 1.0 can't detect updates or newer data, and no later release can change a 1.0 tab that's already running. A 1.0 tab that opens an investigation after 1.1 added connections, discoveries, reflections, challenge responses, or trail notes to it, and is then used to edit it, saves it without them. Reload open tabs after the 1.1 update; see [docs/HOSTING.md](docs/HOSTING.md) for the rollout plan. From 1.1 on, tabs are told about updates, keep data they don't recognise, and refuse to save over newer data.
- **Safety copies** of unsaved edits live in `localStorage`. Where it's unavailable (some private modes), a page closed within a moment of an edit can still lose that edit in browsers that abandon database writes during unload (Firefox does).
- **Evidence connections** allow one connection per pair of cards (the explanation can describe more than one aspect), and changing which cards a connection joins means deleting it and creating a new one. They're shown as a list, not a graph.
- **Discovery trails** exist for one question so far. Trail progress counts only steps the user marks explored; nothing is inferred.
- **Undo** covers one deletion at a time inside the editor (subquestions, hypotheses, evidence, claims). Deleting a whole investigation from My Library is confirmed but can't be undone.
- **Evidence labels** (E1, E2, …) follow list order and shift when a card is deleted. Claim links are unaffected because they use ids, but "E2" typed into free-text notes may then refer to a different card.
- **Offline support starts after the first online visit**, is active only in production builds, and never includes external Church websites.
- **Browser testing:** the full end-to-end suite passes in Chromium (desktop and mobile) and Firefox 148; offline behavior is verified in Chromium only (Playwright can't simulate offline service-worker traffic in Firefox). WebKit/Safari couldn't be run in the test environment, and nothing has been tested on real iOS or Android devices or with a screen reader. The app relies on IndexedDB, service workers, `<dialog>`, and CSS `:has()`, all supported by current versions of these browsers.
- **Reference verification** uses the content service behind the Church's Gospel Library website, which isn't a documented public API. The check may need updating if that service changes. It runs only as a developer script.
- **Content Security Policy** allows inline scripts, which Next.js and the theme script need. It still blocks all third-party requests.
- **English only.**
- **Not implemented:** a way for users to submit questions to the bank (the `submittedBy` field exists for attribution only), cross-device sync, and any AI features (intentionally excluded).

## License

See [LICENSE](LICENSE).
