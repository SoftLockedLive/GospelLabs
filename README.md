# Gospel Labs

**Search the scriptures. Know Him.**

Gospel Labs is a private, Christ-centered scripture-study app for youth and adults of The Church of Jesus Christ of Latter-day Saints. It turns real gospel questions into interactive investigations: you examine verified scriptures and teachings, connect evidence, compare interpretations against the sources, and reach an understanding you can see in a growing Discovery Notebook and Discovery Map. Quiet five-minute sessions, a Character of Christ Builder, and a Scripture Explorer sit alongside it, and the original research notebook is still here for questions of your own.

Gospel Labs never claims religious authority, grades testimony, or measures how spiritual anyone is. There are no points, streaks, or rankings. Every explanation says where it comes from: scripture, an official Church resource, a speaker's teaching, scholarship, Gospel Labs' own suggestion, or your interpretation. It is an independent study tool, not an official Church product.

Versions are MAJOR.MINOR.CONTENT.PATCH (major update, improvements and fixes, new content, and small one-off fixes that deploy quietly); see [docs/VERSIONING.md](docs/VERSIONING.md) and the changelog in `src/content/changelog.json`. Version 2.0 is documented in [docs/GOSPEL_LABS_2.0_RELEASE.md](docs/GOSPEL_LABS_2.0_RELEASE.md) (release report), [docs/2.0/ARCHITECTURE.md](docs/2.0/ARCHITECTURE.md), [docs/2.0/CONTENT_GUIDE.md](docs/2.0/CONTENT_GUIDE.md), [docs/2.0/LEARNER_QUESTIONS.md](docs/2.0/LEARNER_QUESTIONS.md), and [docs/2.0/DOCTRINAL_REVIEW.md](docs/2.0/DOCTRINAL_REVIEW.md). The original specification is [PROJECT_SPEC.md](PROJECT_SPEC.md).

## Study modes (2.0)

- **Dashboard:** continue where you left off, or start an investigation in one tap; choose a quick (three steps, 10–15 minute) or deep (25–35 minute) session; reach Scripture Explorer, Character of Christ, Connect with Christ, your recent discoveries, the Notebook, and the Map.
- **Investigations:** eight guided investigations on the themes learners asked about most (see [docs/2.0/LEARNER_QUESTIONS.md](docs/2.0/LEARNER_QUESTIONS.md)); no survey response is quoted in the app. Each follows Question → Evidence → Discovery → Understanding through interactive activities: Evidence Connections, Clue Investigations, Build the Principle, Compare Perspectives, Scripture Connections, Vocabulary Matching, Sort It Out, Find It in the Text, and optional reflection.
  - **Four difficulty levels** change the kind of reasoning: Easy (spot it in the verses), Medium (connect the pieces), Hard (weigh what the sources say), Complex (put it all together). New learners start at Easy, and the level and session length you last chose are remembered. Change level any time without losing finished steps; light suggestions are optional.
  - **Incorrect answers** get feedback that points back to the evidence, then progressively clearer hints. "Continue anyway" is always there (a skipped step can be tried later), and after two tries, or one once the hints are used, you can see the answer. Nobody gets stuck, and nothing is punished.
  - **Side questions** branch off the main path and return you where you were. Progress saves automatically and survives refreshes and updates.
  - Each investigation names the **primary question** it rests on, and steps are tagged with **methods of learning**, following Elder Lawrence E. Corbridge's BYU devotional "Stand Forever" (2019).
- **Discovery Notebook:** finishing an investigation creates a Discovery Card automatically (sources, concepts, connections, a labeled summary, optional notes), clearly separating what *you discovered* from what *Gospel Labs suggested*. Search, filter, revisit, and manage cards; your 1.x research discoveries appear too.
- **Journal (3.0):** the Notebook's second tab. Write a thought, a question, or a tender mercy, and see everything you've written anywhere in the app (reflections, card notes, private notes, highlight notes, Map connections, research notes) in one feed, each linked back to where you wrote it. A study step can send a thought here, linked to that step.
- **Discovery Map:** a personal knowledge network computed only from your discoveries — scriptures, concepts, questions, attributes, vocabulary, and investigations — where every connection shows its evidence. Add, revise, or remove your own connections (always labeled "Your interpretation"). Pan, zoom, keyboard navigation, and an accessible list view.
- **Scripture Explorer:** eight short passages shown verbatim with links to the full chapter: highlight phrases (touch or keyboard), tag themes, read sourced meanings of key words, compare related scriptures side by side, investigate context, and save to the Notebook and Map.
- **Character of Christ Builder:** nine Christlike attributes (charity, humility, patience, meekness, mercy, compassion, obedience, forgiveness, long-suffering), each with an official definition, vocabulary, easily confused contrasts (such as meekness vs. weakness), scriptures, accounts from the Savior's life, relationships, and activities. It tracks what you've explored, never how Christlike you are.
- **Connect with Christ:** quiet, roughly five-minute sessions in three rotating formats (See Christ, Understand Christ, Reflect on Christ). No timer, no counters, no reports of feelings; prayer and notes are optional.
- **A Christ-centered look (3.0):** white pages, public-domain paintings of the Savior (credited in Settings › About), scripture set like the printed scriptures (Literata, bold verse numbers, italic headnotes, highlighter marks), plain lists, and one ink-blue accent. See [docs/DESIGN.md](docs/DESIGN.md).
- **Themes and preferences:** Daylight (the default), Parchment, Evening, and Lab themes (WCAG 2.2 AA contrast), motion (follow device, full, subtle, off), preferred session length, default difficulty, and activity options, on short Settings pages.
- **Optional AI boundary:** Gospel Labs works fully without AI. A clean interface exists for a future, clearly labeled, server-side assistant; the shipped implementation is a local, non-AI helper built from curated content. No AI service, API key, or network call is included.
- **Welcome and What's new:** new learners get a short welcome and tour (with a theme choice, the version, and how to report a bug); returning learners see what changed since their last visit. Settings › About lists every release.
- **Backups:** export and import everything (research notebooks, study progress, Discovery Cards, journal entries, map connections, explorations, preferences) as versioned JSON (format 4), with validation, previews, merge or replace, and atomic, all-or-nothing imports. See [docs/BACKUPS.md](docs/BACKUPS.md).

## Research notebook (from 1.x, preserved)

The original five-stage research notebook (Question, Hypothesis, Research, Analysis, Conclusion) is unchanged and lives under **Research** (Question Bank, My Library):

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
- Research notebooks, study progress, Discovery Cards, map connections, and explorations are stored only in this browser's IndexedDB. Theme and study preferences are stored in `localStorage`. Backups include all of them.
- The app makes no requests to other sites. Fonts are bundled at build time, and a Content Security Policy (set by the server) limits scripts, styles, fonts, images, and connections to the app's own origin.
- To notice updates, open copies of the app read `/version.json` from their own site now and then (when opened, when the tab is shown again, and every 30 minutes). It sends nothing about the user.
- If a page closes before its last edits are saved, a temporary copy of those edits is kept in this browser's `localStorage` until it's saved.
- Links to ChurchofJesusChrist.org and BYU Speeches open in a new tab only when you choose them, and send no referrer.
- Only developer scripts contact external sites (`npm run verify:references`, `npm run verify:study`); they never run in the app.

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
| `npm run build` | Production build (validates all curated content; invalid content fails the build) |
| `npm start` | Serve the static build in `out/` the way it's served in production (`scripts/serve-out.mjs`) |
| `npm run deploy` | Build and publish to Atlas ([docs/HOSTING.md](docs/HOSTING.md)) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (run `build` or `dev` once first so route types exist) |
| `npm test` | Unit and integration tests (Vitest; IndexedDB via fake-indexeddb), including content validation |
| `npm run test:e2e` | End-to-end tests in Chromium, desktop and mobile (Playwright); run `npm run build` first |
| `npm run verify:production` | After a deployment: check the live site's security headers, update manifest, caching, clean URLs, and 404 page (read-only; needs network) |
| `npm run verify:references` | Check every 1.x question-bank and trail link and quotation, then all 2.0 study content (needs network) |
| `npm run verify:study` | Check every 2.0 source link, scripture verse, excerpt, and quotation word for word against the original (`-- --only <file>` for one file; needs network) |
| `npm run learner-questions -- "<xlsx>"` | Import the learner-question survey verbatim into git-ignored `data/private/` |
| `node scripts/review-notes.mjs` | Regenerate [docs/2.0/DOCTRINAL_REVIEW.md](docs/2.0/DOCTRINAL_REVIEW.md) from content review notes |
| `node scripts/scripture.mjs verses\|text\|find\|title <url>` | Content-authoring helper: copy exact verse text, find a quotation, or check a link |
| `npm run questions:schema` | Regenerate the question bank's JSON Schema after changing its Zod schema |

End-to-end tests need a Chromium browser: run `npx playwright install chromium` once, or set `CHROMIUM_PATH` to an existing Chromium or Chrome executable.

> **npm 9 note:** Debian's packaged npm 9.2 crashes when adding packages to this project (`Cannot read properties of null (reading 'edgesOut')`). Installing from the lockfile works. Use npm 10 or newer to add or update packages, for example `npx npm@10 install <package>`.

## Hosting

Gospel Labs is a static export served by Caddy on Atlas, a self-hosted server, at <https://gospellabs.softlockedlive.com>. There's no server-side code, database, or environment variable: `npm run build` writes the whole site to `out/`, and `npm run deploy` uploads it and swaps it in, keeping the previous build for a quick rollback. Security headers (Content-Security-Policy and others) are set by Caddy, not by this repository.

Investigations stay in each visitor's browser (IndexedDB) and are never uploaded, so deploying or rolling back can't delete them, and Atlas has no copy to restore.

See **[docs/HOSTING.md](docs/HOSTING.md)** for building, testing, deploying, rolling back, and how Atlas serves the site.

## Offline behavior

After one online visit, the service worker caches the app shell: the dashboard, every investigation, Scripture Explorer passage, and Character of Christ page, Connect with Christ, the Notebook, the Map, the question bank, the library, settings, and the static files they need. Offline you can study, keep notes, explore, open your Notebook and Map, use the research notebook, and export or import backups.

- Links to ChurchofJesusChrist.org and BYU Speeches need a connection. Gospel Labs never caches other sites, and shows a notice while offline saying so.
- A page that was never cached shows an "isn't available offline" page instead of a browser error.
- Pages are fetched from the network first when online, so updates appear right away. The cache is the fallback.

## Adding content

All curated content is JSON validated by Zod at build time; no code changes are needed to edit it.

- **Investigations, attributes, passages, Connect sessions:** `src/content/` (one file per item, listed in each folder's `index.ts`). Follow [docs/2.0/CONTENT_GUIDE.md](docs/2.0/CONTENT_GUIDE.md): copy scripture with `node scripts/scripture.mjs`, never from memory, and run `npm run verify:study` and `npm test`. Mark anything interpretive in the file's `review` notes.
- **Shared concepts** (Discovery Map nodes): `src/content/concepts.json`.
- **1.x questions, research challenges, and discovery trails:** [`src/data/`](src/data/); see [docs/QUESTION_BANK.md](docs/QUESTION_BANK.md), [docs/RESEARCH_CHALLENGES.md](docs/RESEARCH_CHALLENGES.md), and [docs/DISCOVERY_TRAILS.md](docs/DISCOVERY_TRAILS.md).

## Feedback

Bug reports and ideas go to **[gospellabs@proton.me](mailto:gospellabs@proton.me)**. In the app, **Settings › Send feedback** opens your email app with a short template, and the error page links to the same address. Nothing is sent automatically, and investigations are never attached.

## Project structure

```
src/
  app/                        Routes (App Router); every page is exported as static HTML
    page.tsx                  Dashboard
    investigate/, investigate/[id]   Guided investigations
    explore/, explore/[id]    Scripture Explorer
    character/, character/[id]  Character of Christ Builder
    connect/                  Connect with Christ
    notebook/, map/           Discovery Notebook and Discovery Map (personal data via ?card= / ?node=)
    questions/, library/, investigations/   1.x research notebook (unchanged)
    settings/, offline/
  components/
    study/                    2.0 features: activities/, player/, explorer/, character/, connect/,
                              notebook/, map/, dashboard/, shared/ (sources, provenance labels)
    ui/                       Primitives: Button, Card, Dialog, Tabs, Sheet, SegmentedControl, …
    layout/                   App shell and navigation
    workspace/, library/, questions/, settings/, investigations/, pwa/   (1.x and shared)
  content/                    2.0 curated content (JSON) and learner-question families
  data/                       1.x question bank, research challenges, discovery trails
  domain/
    study/                    2.0 pure logic and schemas: vocabulary, content schema and registry,
                              user data, engine/, activities/ (answer checking), cards/, graph,
                              suggestions, connect rotation
    …                         1.x investigation model, reducer, question bank, trails
  persistence/                Dexie database (v2), repositories, autosave, backups, React hooks
  lib/                        Utilities, preferences, theme, routes, study-content loader, assist/
public/                       sw.js (service worker), PWA icons
e2e/                          Playwright end-to-end tests
scripts/                      deploy, local server, security headers, verification and content tools
docs/                         2.0/ (architecture, content guide, learner questions, doctrinal review),
                              release reports, hosting, backups, 1.x feature docs
```

### Architecture notes

See [docs/2.0/ARCHITECTURE.md](docs/2.0/ARCHITECTURE.md) for the full design. In brief:

- **Content is data.** Curated content lives in `src/content/` and is validated (schemas plus cross-file checks: every source, concept, and Map node exists; highlight passages match their verses exactly) when the app builds.
- **Study data** lives in four IndexedDB tables added in database version 2 (`studyProgress`, `discoveries`, `personalConnections`, `explorations`), beside the untouched 1.x `investigations` table. The Notebook and Map read the same Discovery Cards, so they can't disagree.
- **The engine is pure.** Progression, difficulty, hints, and branching are a deterministic reducer (`src/domain/study/engine/`); answer checking is pure per activity type (`src/domain/study/activities/`). Both are unit-tested against all real content.
- **1.x research notebook:**
  - **Data model:** one self-contained IndexedDB record per investigation; evidence cards, claims, evidence connections, discoveries, challenge responses, trail notes, and reflections inside it reference each other by id. New data is added as new fields with defaults, so older records load without a migration, and fields added by newer versions are preserved rather than dropped. Zod schemas in `src/domain/investigation.ts` define the types and validate records on every read, write, and import.
  - **State:** every change goes through a pure reducer (`src/domain/investigation-reducer.ts`) via React's `useReducer`; ids and timestamps are passed in, so operations are deterministic and unit-tested.
  - **Persistence:** `src/persistence/investigation-repository.ts` validates data, maps browser storage failures to clear messages, refuses to overwrite changes made elsewhere, and runs multi-record operations in a single transaction. `src/persistence/autosave.ts` debounces and serializes saves independently of React.

## Testing

- **Unit and integration tests (Vitest):** the 1.x suite plus the 2.0 schemas and content registry (all shipped content validated, every activity's revealed answer checked correct), answer checking for every activity type, the progression engine (difficulty changes, hints, branching, persistence, a playthrough of every investigation), Discovery Card builders, the Map graph and deterministic layout, Notebook search, suggestions, Connect rotation, study repositories, database version-2 upgrade and rollback safety, and backup formats 3 and 4 (round trips, migrations from formats 1 and 2, atomic rollback, merge rules, preferences).
- **End-to-end tests (Playwright; desktop and mobile Chromium):** run under the production security headers. The 1.x regression suite, plus 2.0 flows; see [docs/GOSPEL_LABS_2.0_RELEASE.md](docs/GOSPEL_LABS_2.0_RELEASE.md) for the current list and results.
- **Content verification:** `npm run verify:study` checks every source, verse, excerpt, and quotation in 2.0 content against the original.

## Known limitations

- **One browser, one device.** There is no sync (the data model is ready for it: stable ids, timestamps, version stamps). Use export and import to move study between browsers or devices.
- **Clearing site data deletes everything stored.** Regular backups are the safeguard. The browser may grant "persistent storage" (Settings), but that is its decision.
- **Study progress is last-write-wins** across tabs (research notebooks keep 1.1's conflict detection).
- **Scripture text is limited to short passages** (at most 12 verses per source); everything else links to the original.
- **Overlapping verse ranges** cited by different content (e.g. John 15:9–15 and John 15:13–15) appear as separate Map nodes.
- **Doctrinal review:** all quotations are verified and every interpretive note has a recorded resolution (qualified, corrected, or withheld to `docs/2.0/withheld/`), but 17 items still await the owner's personal review; see [docs/2.0/DOCTRINAL_REVIEW.md](docs/2.0/DOCTRINAL_REVIEW.md).
- **Multiple tabs:** changes from another tab are noticed immediately, and conflicting edits are never overwritten silently, but they aren't merged either: the user chooses which version to keep.
- **Tabs left open from 1.0:** version 1.0 can't detect updates or newer data, and no later release can change a 1.0 tab that's already running. A 1.0 tab that opens an investigation after 1.1 added connections, discoveries, reflections, challenge responses, or trail notes to it, and is then used to edit it, saves it without them. Reload open tabs after the 1.1 update; see [docs/HOSTING.md](docs/HOSTING.md) for the rollout plan. From 1.1 on, tabs are told about updates, keep data they don't recognise, and refuse to save over newer data.
- **Safety copies** of unsaved edits live in `localStorage`. Where it's unavailable (some private modes), a page closed within a moment of an edit can still lose that edit in browsers that abandon database writes during unload (Firefox does).
- **Evidence connections** allow one connection per pair of cards (the explanation can describe more than one aspect), and changing which cards a connection joins means deleting it and creating a new one. They're shown as a list, not a graph.
- **Discovery trails** exist for one question so far. Trail progress counts only steps the user marks explored; nothing is inferred.
- **Undo** covers one deletion at a time inside the editor (subquestions, hypotheses, evidence, claims). Deleting a whole investigation from My Library is confirmed but can't be undone.
- **Evidence labels** (E1, E2, …) follow list order and shift when a card is deleted. Claim links are unaffected because they use ids, but "E2" typed into free-text notes may then refer to a different card.
- **Reference verification** uses the content service behind the Church's Gospel Library website, which isn't a documented public API. The check may need updating if that service changes. It runs only as a developer script.
- **Content Security Policy** allows inline scripts, which Next.js and the theme script need. It still blocks all third-party requests.
- **Offline support starts after the first online visit**, is active only in production builds, and never includes external websites.
- **Browser testing:** see the release report. WebKit/Safari, real phones, and screen readers haven't been tested.
- **English only.**

## License

See [LICENSE](LICENSE).
