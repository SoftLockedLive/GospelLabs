# Gospel Labs

**Question. Study. Discover.**

Gospel Labs is a private, mobile-first research notebook for members of The Church of Jesus Christ of Latter-day Saints who want to study gospel questions carefully. Each investigation moves through five stages (Question, Hypothesis, Research, Analysis, Conclusion) that you can visit in any order. You gather evidence from scriptures and Church resources, link that evidence to the claims you make, and write your own conclusions.

Gospel Labs never provides doctrinal answers, grades conclusions, or claims religious authority. It is an independent study tool, not an official Church product.

See [PROJECT_SPEC.md](PROJECT_SPEC.md) for the full product specification.

## Features

- **Investigation workspace:** five freely navigable sections; optional subquestions and any number of hypotheses; evidence cards (create, edit, delete) with source, link, observation, relevance, and tags; claims in Analysis and Conclusion linked to evidence; user-controlled status (investigating, partially understood, concluded), with concluded investigations still editable; Undo for deletions.
- **Autosave:** every change is saved on the device as you type, including when you switch tabs, navigate away, or close the page. Investigations reopen at the section you last used. If the same investigation is changed in another tab, Gospel Labs stops and asks rather than overwriting.
- **Question bank:** 12 curated questions with search, topic and difficulty filters, random selection, verified links to official Church scripture and Gospel Topics pages, and study prompts. Suggested references are starting points, never automatic evidence.
- **My Library:** search, filter by status, resume or reopen, preview evidence, and delete with confirmation.
- **Backups:** export everything as versioned JSON; import with merge or replace, with validation, a preview, and safeguards. See [docs/BACKUPS.md](docs/BACKUPS.md).
- **Installable and offline:** a Progressive Web App that keeps working without a connection after the first visit.
- **Accessible:** keyboard operable throughout, screen-reader labels and announcements, WCAG 2.2 AA contrast in dark and light themes, reduced-motion support.

## Privacy

- No accounts, analytics, advertising, tracking, cookies, AI, or cloud services.
- Investigations are stored only in this browser's IndexedDB. The theme choice is stored in `localStorage`.
- The app makes no requests to other sites. Fonts are bundled at build time, and a Content Security Policy limits scripts, styles, fonts, images, and connections to the app's own origin.
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
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (run `build` or `dev` once first so route types exist) |
| `npm test` | Unit and integration tests (Vitest; IndexedDB via fake-indexeddb) |
| `npm run test:e2e` | End-to-end tests in Chromium, desktop and mobile (Playwright); run `npm run build` first |
| `npm run verify:references` | Check every question-bank link against ChurchofJesusChrist.org (needs network) |
| `npm run questions:schema` | Regenerate the question bank's JSON Schema after changing its Zod schema |

End-to-end tests need a Chromium browser: run `npx playwright install chromium` once, or set `CHROMIUM_PATH` to an existing Chromium or Chrome executable.

> **npm 9 note:** Debian's packaged npm 9.2 crashes when adding packages to this project (`Cannot read properties of null (reading 'edgesOut')`). Installing from the lockfile works. Use npm 10 or newer to add or update packages, for example `npx npm@10 install <package>`.

## Deploying to Vercel

The app is a standard Next.js 16 project with no server-side data, environment variables, or databases. Every page is prerendered. Unknown question ids are the only thing rendered on demand, and they just show "not found".

1. Push the repository to GitHub, GitLab, or Bitbucket.
2. In Vercel, choose **Add New › Project** and import the repository. Vercel detects Next.js; keep the defaults (build command `next build`, install command `npm install`, Node.js 22 from `package.json` `engines`).
3. Deploy. No environment variables are required.

Or, with the Vercel CLI: `npx vercel` for a preview deployment, `npx vercel --prod` for production.

What to expect after deploying:

- Each deployment gets a new service-worker version (from `VERCEL_GIT_COMMIT_SHA`), so installed apps pick up the update on their next visit and old caches are removed.
- Security headers (CSP, `Referrer-Policy: no-referrer`, `X-Content-Type-Options`, `Permissions-Policy`) come from `next.config.ts`; Vercel adds HTTPS and HSTS.
- On **preview** deployments, the Content Security Policy blocks Vercel's preview toolbar (it loads from `vercel.live`). The app itself is unaffected; production deployments don't load the toolbar.
- Investigations belong to the browser and the domain. Data saved on a preview URL is not visible on the production URL, and vice versa.

## Offline behavior

After one online visit, the service worker caches the app shell: the dashboard, question bank (including every question page), library, settings, the investigation editor, and the static files they need. Offline, you can open, edit, and create investigations, browse the question bank, and export or import backups.

- Links to ChurchofJesusChrist.org need a connection. Gospel Labs never caches other sites, and shows a notice while offline saying so.
- A page that was never cached shows an "isn't available offline" page instead of a browser error.
- Pages are fetched from the network first when online, so updates appear right away. The cache is the fallback.

## Adding questions

Edit [`src/data/question-bank.json`](src/data/question-bank.json); no code changes are needed. See [docs/QUESTION_BANK.md](docs/QUESTION_BANK.md) for the fields, rules, and how links are verified.

## Project structure

```
src/
  app/                        Routes (App Router); all pages are prerendered
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
    workspace/                Investigation editor, sections, evidence/, claims/, undo, autosave status
    library/, dashboard/, questions/, settings/, investigations/, pwa/
  data/                       question-bank.json and its generated JSON Schema
  domain/                     Pure logic and Zod schemas: investigation model and reducer,
                              evidence input, question bank, filters, factory
  persistence/                Dexie database, repository, autosave controller, backups, React hooks
  lib/                        Utilities (ids, dates, routes, theme, downloads)
public/                       sw.js (service worker), PWA icons
e2e/                          Playwright end-to-end tests
scripts/                      verify-references.mjs
docs/                         QUESTION_BANK.md, BACKUPS.md
```

### Architecture notes

- **Data model:** one self-contained IndexedDB record per investigation; evidence cards and claims inside it reference each other by id. Zod schemas in `src/domain/investigation.ts` define the types and validate records on every read, write, and import.
- **State:** every change goes through a pure reducer (`src/domain/investigation-reducer.ts`) via React's `useReducer`; ids and timestamps are passed in, so operations are deterministic and unit-tested.
- **Persistence:** `src/persistence/investigation-repository.ts` validates data, maps browser storage failures to clear messages, refuses to overwrite changes made elsewhere, and runs multi-record operations in a single transaction. `src/persistence/autosave.ts` debounces and serializes saves independently of React.

## Testing

- **Unit and integration tests (Vitest, 160+):** the investigation reducer, schema and integrity rules, evidence input, question-bank validation, search, filters and random selection, persistence against a real IndexedDB implementation, autosave timing and conflicts, and backup export/import round trips, including transactional rollback.
- **End-to-end tests (Playwright, desktop and mobile Chromium):** create, edit, resume, conclude, and reopen; curated questions; delete confirmation; export, delete everything, and restore; replace with its safeguards; damaged and newer-version backups; and full offline use.

## Known limitations

- **One browser, one device.** There is no sync. Use export and import to move investigations between browsers or devices.
- **Clearing site data deletes investigations.** Regular backups are the safeguard. The browser may grant "persistent storage" (Settings), but that is its decision.
- **Multiple tabs:** editing the same investigation in two tabs is detected and the user chooses which version to keep. Changes are not merged automatically.
- **Undo** covers one deletion at a time inside the editor (subquestions, hypotheses, evidence, claims). Deleting a whole investigation from My Library is confirmed but can't be undone.
- **Evidence labels** (E1, E2, …) follow list order and shift when a card is deleted. Claim links are unaffected because they use ids, but "E2" typed into free-text notes may then refer to a different card.
- **Offline support starts after the first online visit**, is active only in production builds, and never includes external Church websites.
- **Browser testing:** automated tests run in Chromium only. Safari (including iOS) and Firefox have not been tested on real devices. The app relies on IndexedDB, service workers, `<dialog>`, and CSS `:has()`, all supported by current versions of those browsers.
- **Reference verification** uses the content service behind the Church's Gospel Library website, which isn't a documented public API. The check may need updating if that service changes. It runs only as a developer script.
- **Content Security Policy** allows inline scripts, which Next.js and the theme script need. It still blocks all third-party requests.
- **English only.**
- **Not implemented:** a way for users to submit questions to the bank (the `submittedBy` field exists for attribution only), cross-device sync, and any AI features (intentionally excluded).

## License

See [LICENSE](LICENSE).
