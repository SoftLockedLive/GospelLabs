# Gospel Labs 2.0: release report

Prepared 26 October 2026. **Released to production on 26 October 2026** with the owner's explicit authorization: merged into `main`, pushed to GitHub, and deployed to Atlas. See [Production release](#production-release) for the live URL, deployed commit, and rollback path.

## Release status

**Gospel Labs 2.0 is live.** Before release, the owner asked for four things:
- privacy cleanup;
- a git security check;
- abuse-help links;
- resolution of the doctrinal review notes.

All four were completed (see [Release preparation](#release-preparation)). Every automated check passed on the released build. Content still marked *needs-review* ships with qualified wording. Withheld items are kept in `docs/2.0/withheld/` for the owner's later review.

Manual device checks (Safari/iOS, a real Android phone, and a screen reader) are still recommended after release; they couldn't be run here.

## What was implemented

| Area | What learners get |
| --- | --- |
| **Dashboard** (`/`) | A welcoming home with one primary action: continue where they left off, or start the suggested investigation. Studying begins within two interactions (tested). There's a Quick (5–10 min) / Deep (20–40 min) toggle, suggestions, and entry points to Scripture Explorer, Character of Christ, Connect with Christ (today's session), recent discoveries, the Notebook, the Map, and the 1.x research notebook. No statistics, charts, or streaks. |
| **Investigation engine** (`/investigate`, `/investigate/[id]`) | Data-driven investigations following Question → Evidence → Discovery → Understanding. There are nine activity types: Evidence Connections, Clue Investigation, Build the Principle, Compare Perspectives, Scripture Connections, Vocabulary Matching, Sort It Out, Find It in the Text, and optional Reflection. All work by touch and keyboard, with no drag-only interactions. **Four difficulty levels** change the kind of reasoning required, and the level can be changed mid-way without losing finished steps; light, optional difficulty suggestions are offered. **Wrong answers** get feedback that points back to the evidence without revealing the answer, then progressively clearer hints; after three tries learners can choose "Show me" or "Continue anyway". **Side questions** branch off and return to the same step. Progress autosaves and survives reloads. Each investigation names the **primary question** it rests on, and steps are tagged with **methods of learning** (Elder Corbridge). |
| **Discovery Notebook** (`/notebook`) | A Discovery Card is created automatically when an investigation is completed (Explorer, Character, and Connect can also save cards). Each card shows its sources, concepts, connections, and a summary labeled "Suggested by Gospel Labs", and keeps "You discovered" separate from "Suggested". Notes are optional and autosave. Cards can be searched, filtered, opened, and deleted, and link back to their origin. 1.x research discoveries appear in their own read-only section. |
| **Discovery Map** (`/map`) | A personal network computed only from the learner's cards and personal connections; no prepopulated diagram. It shows scriptures, concepts, questions, attributes, vocabulary, and investigations. Every edge shows its evidence and provenance. Learners can add, revise, and remove their own connections, always labeled "Your interpretation". The deterministic layout supports pan and zoom and keyboard navigation, and has an accessible list view; new nodes since the last visit get a gentle pulse. |
| **Scripture Explorer** (`/explore`) | Eight short passages shown verbatim (at most 12 verses each), linked to the full chapter. Learners highlight phrases (tap or keyboard; a compact save bar on phones), tag themes, read sourced meanings of key words, compare related scriptures side by side, explore context questions and activities, and save to the Notebook and Map. |
| **Character of Christ Builder** (`/character`) | Nine attributes: charity, humility, patience, meekness, mercy, compassion, obedience, forgiveness, and long-suffering. Each has an official definition, 5–6 vocabulary words, contrasts with easily confused ideas (meekness vs. weakness; forgiving vs. condoning or staying in harm's way), scriptures, accounts from the Savior's life, sourced relationships, and activities. It tracks material explored, never righteousness. |
| **Connect with Christ** (`/connect`) | Fifteen quiet, roughly five-minute sessions in three daily-rotating formats: See, Understand, and Reflect. It uses a distinct reading layout and has no timer, counters, or streaks. There is no request to report feelings; prayer and notes are optional. |
| **Themes and accessibility** | Four themes (Lab, Daylight, Parchment, Evening) plus System. Animation intensity can follow the device or be set to Full, Subtle, or Off (the device's reduced-motion setting is honored). Learners can set a preferred session length, a default difficulty, and activity options. There's a skip link, visible focus, a live region for feedback, 44px touch targets, and WCAG 2.2 AA contrast. Scripture is set in Literata. |
| **Local-first data** | Autosaving, backup format 3 (everything plus preferences), import validation, merge or replace across all tables in one transaction, migrations from formats 1 and 2, recovery from malformed files, and safeguards against accidental overwrites. No account is needed and there is no cloud sync; the data model is ready for sync later. |
| **Optional AI boundary** | A `StudyAssistant` interface with a shipped **local, non-AI** implementation built from curated content (term explanations, more help, follow-up questions). There is no AI service, API key, or network call. [src/lib/assist/README.md](../src/lib/assist/README.md) defines how a future server-side provider must label its output. |
| **Content** | 8 investigations (198 activities), 9 attributes, 8 passages, and 15 Connect sessions. **347 unique sources and 2,587 quotations checked against the originals: 0 failures.** |

## Important architecture decisions

The full contract is in [docs/2.0/ARCHITECTURE.md](2.0/ARCHITECTURE.md).

1. **Content is data.** All study material is JSON in `src/content/`, validated by Zod schemas. A cross-file registry check confirms that every source, concept, branch, and Map node exists, that shared sources are declared identically, and that highlight passages join exactly to the verse text. The checks run in tests and at build time, so invalid content can't ship.
2. **Accuracy is enforced by tooling, not trust.**
   - Authors copy text with `scripts/scripture.mjs` instead of typing it.
   - `npm run verify:study` checks every link, verse, excerpt, and “quotation” word for word against ChurchofJesusChrist.org (Gospel Library content service) and BYU Speeches.
   - Interpretive choices are recorded in each file's `review` notes and gathered into the doctrinal review list.
3. **Provenance is always visible.** Every source carries its kind (scripture / official / speaker / scholarly). App-written text is labeled "Suggested by Gospel Labs", the learner's own work "You discovered" or "Your interpretation", and any future AI output would read "AI-generated — not doctrine or revelation".
4. **Storage is additive.** Dexie database version 2 adds four tables (`studyProgress`, `discoveries`, `personalConnections`, `explorations`) and leaves the 1.x `investigations` table and its records untouched. No data migration runs. Dexie 4 opens databases with a higher version than it declares, so **1.1 can still open the upgraded database** (unit-tested; the 1.1→2.0 upgrade is also E2E-tested), which keeps a rollback to 1.1 safe.
5. **One data model for the Notebook and the Map.** The Map is computed from Discovery Cards and personal connections, so the two views can't disagree, and the Map grows only from actual study.
6. **The engine is pure and deterministic.** Answer checking and progression are pure functions, unit-tested against every real investigation, including a full playthrough of each.
7. **Elder Corbridge's "Stand Forever" (BYU, 22 January 2019) shapes the learning design without forcing a template.** Each investigation names the primary question beneath it (God, Christ, Joseph Smith, the kingdom), and steps are tagged with his scientific, analytical, academic, and divine methods of learning. The `primary-questions` investigation teaches the framework directly.
8. **Privacy of the learner survey.** The repository is public, so the verbatim survey stays in git-ignored `data/private/` (regenerated by `npm run learner-questions`), and only theme families and row numbers are committed.
9. **Parallel development.** The foundation (schemas, registry, storage, verification tools, shared components) was written first as an integration contract. Eleven specialized agents then built disjoint parts in parallel, a QA agent added end-to-end coverage, and an independent review checked the data-safety paths. Each part was integrated and committed as it finished.

## Existing features reused or replaced

- **Kept unchanged (Research):**
  - the 1.x five-section research notebook, question bank (13 questions), discovery trail, evidence connections, research challenges, Come unto Christ reflection, and My Library;
  - autosave with conflict detection, the update notice, and the PWA and offline support;
  - the feedback section;
  - 1.x records and their `RECORD_DATA_VERSION` (still 2).
- **Extended:**
  - **Backups:** format 2 became format 3; formats 1 and 2 still import.
  - **Settings:** themes, motion, and study preferences.
  - **UI primitives:** Button, Card, Badge, and Dialog keep their APIs; Tabs, Sheet, SegmentedControl, Switch, Disclosure, Skeleton, ChoiceCard, and ProgressPath were added.
  - **Service worker:** precaches the new routes and their detail pages.
  - **Theme storage:** keeps its 1.x key.
  - **Reference verifier:** now also checks 2.0 content.
- **Replaced:**
  - The 1.x dashboard became the 2.0 study dashboard; the 1.x dashboard components were removed because they were unused.
  - Navigation is now grouped (Study / Discoveries / Research, with a mobile More sheet). The 1.x labels "Question Bank" and "My Library" are kept.
- **Fixed along the way:** a 1.1 bug where unsaved-edit recovery could be deferred when first triggered from a live query.

## The investigations selected from the spreadsheet

The spreadsheet holds 128 anonymous responses, grouped into 23 theme families. The analysis, misconceptions, and backlog are in [docs/2.0/LEARNER_QUESTIONS.md](2.0/LEARNER_QUESTIONS.md).

| # | Investigation | Central question | Survey family (rows) | Primary question |
| --- | --- | --- | --- | --- |
| 1 | `one-by-one` | How could Jesus Christ suffer for each of us personally? | atonement-personal | Christ |
| 2 | `christ-at-the-center` | Why does the gospel center on Jesus Christ? | christ-and-godhead | Christ |
| 3 | `recognizing-the-spirit` | Why don't I feel the Spirit — and how would I recognize Him? | spirit-and-revelation | Christ |
| 4 | `primary-questions` | How can I come to know the gospel is true when I have hard questions? | knowing-truth + hard-questions | Christ |
| 5 | `when-faithful-people-suffer` | Why do faithful people still go through hard things? | trials-and-suffering | God |
| 6 | `again-and-again` | Does God still forgive me when I keep making the same mistake? | repentance-and-forgiveness + worthiness | Christ |
| 7 | `fear-god-friend` | Should I fear God, or is He my friend? | fear-and-friendship | God |
| 8 | `families-beyond-the-veil` | Will I see my family and friends again if they aren't members of the Church? | families-and-afterlife | Christ |

Every investigation has 5–6 core steps plus deep steps, with four difficulty variants per core step, 1–2 side branches, a discovery summary with a Christ connection, Map connections, and 19–29 verified sources. Prayer and answers (rows 49, 110, 122) is the strongest candidate for the next release.

## Release preparation

### Privacy cleanup

- **No survey text in the app.** The verbatim "Learners asked…" quotes were removed. Each investigation now lists 2–3 "Questions people ask" (`commonQuestions`), written in general terms.
- **No individual learners in the text.** Every reference to an individual learner ("A learner asked…", "One learner described…") and every personal detail from a response was rewritten as a general question ("Many people wonder…"). This covers intros, prompts, compare "voices", and review notes. Two central questions were rephrased to stay well clear of survey wording ("Why does the gospel center on Jesus Christ?" and "How can I come to know the gospel is true when I have hard questions?").
- **Enforced by the verifier.** `npm run verify:study` now fails if any content contains survey text (any run of 7 words from a response). The released content passes: *no survey text in 26 content files*. Reviewers also ran stricter 4- and 5-word checks on their files.
- **Docs generalized too.** Survey row numbers and descriptions of individual responses were removed from the review notes, the family observations, and the docs. Theme families still list the row numbers, with no text.

### Git security

- **The spreadsheet stays out of git.** The spreadsheet, its PDF, and `data/private/` were never committed; `data/private/` remains in `.gitignore`.
- **Sensitive commits were not pushed.** A scan of every unpushed commit found verbatim survey questions in the intermediate 2.0 development commits (the old in-app quotes). Those commits were **not pushed**. Instead `v2.0-redesign` was **squash-merged** into `main`, so the public history contains the two 1.1 commits that were already local plus one 2.0 release commit whose tree was scanned clean.
- **Detailed history stays local.** The development history stays only on the local `v2.0-redesign` branch, which must never be pushed.
- **No secrets or personal information.** The 1.1 commits and the release tree were scanned for credentials (private keys, tokens, API keys, passwords, `.env` files) and for personal information (personal email, LAN addresses). None was found.

### Abuse help and safety wording

- **Where it appears.** An "If someone is hurting you" notice, placed right after the definition, links the Church's official abuse help (https://abuse.churchofjesuschrist.org/, which Gospel Topics: Abuse points to) and Gospel Topics: Abuse. It is on **forgiveness** and **long-suffering**, and also on charity, patience, meekness, and mercy, where wording such as "beareth all things" or "endure … without complaint" could be misread.
- **What it rests on.** The wording quotes only verified sources:
  - Elder Holland: the Lord didn't say "you have to reenter a toxic relationship or return to an abusive, destructive circumstance".
  - Elder Duncan: forgiving does not mean we "allow others to mistreat us".
  - Gospel Topics: "No one is expected to endure abusive behavior"; victims "are never to blame".
- **Trust.** Nothing states or implies that forgiveness requires staying in an unsafe situation or restoring trust. No official source on trust was found, so no doctrine about trust is asserted.
- **Abuse branch.** The abuse-related branch in `when-faithful-people-suffer` now says plainly that victims should seek help and are not to blame.

### Doctrinal review

Six reviewers worked through every review note: **124 notes across 25 items**, each with a recorded resolution in [docs/2.0/DOCTRINAL_REVIEW.md](2.0/DOCTRINAL_REVIEW.md). The resolutions fall into three kinds:
- **Resolved:** straightforward wording, citation, or attribution fixes, checked against sources. These included the speakers' callings at the time, footnote citations, and a factual footnote error in the meekness vocabulary.
- **Qualified:** interpretations are now clearly framed as interpretations ("many readers understand…", "Gospel Labs suggests…", "Elder Corbridge taught…"). Claims about "scripture" as a whole are bounded to "these passages". No activity rewards a contested reading as its correct answer.
- **Withheld:** 19 items where an activity rewarded, or stated as fact, an interpretation the sources don't settle. Each was replaced with content built from what the sources plainly say. The originals and the reasons are kept in `docs/2.0/withheld/` for the owner:
  - `again-and-again`: 6 items (weakness vs. sin edge cases; answers that settled the meaning of 2 Nephi 25:23; a repentance distractor).
  - `fear-god-friend`: 9 items, all of which identified the unnamed "him" in Luke 12:5 or built on a two-senses reading.
  - `recognizing-the-spirit`: 2 items (a "where a thought leads matters more than its source" conclusion; a "safe to act on" inference).
  - `when-faithful-people-suffer`: 2 items (an abuse-branch statement that could be read as leaving open that God wants someone's abuse; a contested reading of Isaiah 53:4).

**Status after review:** 8 items are *verified*. 17 remain *needs-review*: they ship with qualified wording, but they touch doctrine the owner should still personally confirm. The most important are:
- the families-beyond-the-veil framing and its other-faiths branch;
- Elder Corbridge's framework as the backbone of `primary-questions`;
- God's role in trials;
- the weakness/sin synthesis;
- the forgiveness and long-suffering safety wording.

All 351 sources and 2,721 quotations still verify word for word.

## Tests executed

All runs are on this machine against the released content. End-to-end tests ran under the production security headers (CSP), using Brave as the Chromium browser.

| Check | Result |
| --- | --- |
| Baseline before any change (1.1) | Lint and typecheck clean; 324 unit tests passed; build passed; 50 E2E passed |
| ESLint | Clean |
| TypeScript (`tsc --noEmit`) | Clean |
| Unit and integration tests (Vitest) | **1,408 passed** in 59 files (324 from 1.x, all still passing), on the release content |
| Production build (`output: "export"`) | Passed: 56 static pages, including 8 investigations, 8 passages, and 9 attributes |
| End-to-end, desktop and mobile Chromium | **201 passed, 3 skipped (by design: device-specific tests)**, 0 failed, on the reviewed release content (and on two consecutive runs before the review) |
| Accessibility (axe 4.14; WCAG 2.0/2.1/2.2 A and AA) | **0 violations** in all four themes, desktop and mobile: 15 pages, investigation states (feedback, hints, dialogs, branches, completion), Map with details and the connection dialog, Connect session, and Settings dialogs |
| Responsive | No horizontal scrolling at 320, 768, and 1280 px on all main pages and investigation steps |
| Offline | After one visit, investigations, Explorer, Character, Connect, Notebook, and Map work offline, including studying and highlighting |
| No external requests / no AI | A full study session makes no request to another origin; nothing is labeled AI-generated |
| `npm run verify:study` | **351 sources, 2,721 quotations, 0 failures**; privacy check: no survey text in 26 content files |
| `npm run verify:references` (1.x) | 54/54 links and 24/24 trail quotations verified |

**What the end-to-end suite covers:**
- **1.x regression:** the full 1.x suite, with three expectations updated for 2.0 (backup format 3, and the dashboard's research link).
- **Dashboard:** starting an investigation, the Quick/Deep toggle, and Continue studying.
- **Investigation flow:**
  - wrong answers and hints;
  - Show me and Continue anyway;
  - difficulty and length changes;
  - branches, and reloading mid-step;
  - card provenance, and re-completion.
- **Activity types:** all nine, including keyboard-only use.
- **Notebook and Map:**
  - card contents and notes;
  - Map and list consistency;
  - personal connections;
  - deleting a card.
- **Scripture Explorer:** mouse, keyboard, and phone highlighting; key phrases; activities; saving.
- **Character of Christ:** exploration tracking, activities, and saving; no scoring language.
- **Connect with Christ:** formats, rotation, notes, and optional saving; no timers or counters.
- **Settings:** themes and System, motion and reduced motion, activity options.
- **Backups:**
  - a full backup round trip with study data and preferences;
  - format 3 files, damaged files, and files from newer versions;
  - 1.0 and 1.1 backups.
- **Upgrade:** a database from 1.1 upgraded to 2.0.
- **Responsive layout, accessibility, and offline use.**

**Independent data-safety review.** After QA, a read-only reviewer checked storage, migrations, backups, and every place that writes study data. It found no blockers and confirmed 1.x data handling is unchanged. It reported three should-fix issues and five minor ones, all now fixed and covered by new unit and E2E tests:

- **Should-fix:**
  - Progress saved against *newer* content could be rewritten by an older tab or a rollback; it's now read-only.
  - A load error or unreadable record was treated as "no record", so the next save could replace the learner's data. The repository now refuses to replace records it can't read, and every screen waits for a successful read before writing.
  - Some notes could be lost on back navigation or an update reload; all note editors now flush on unmount, page hide, and before "Update now".
- **Minor:**
  - A two-tab sequence could duplicate a Discovery Card.
  - A page visit counted as an edit in backup merges.
  - Re-completing dropped earlier discoveries.
  - Notes for a card deleted elsewhere were silently discarded.
  - Malformed activity states were pruned on write.
- **Found while fixing:**
  - **Save to Notebook & Map** in Explorer was clickable before the page had read the learner's saved highlights, so clicking it could replace a card's highlights with none.
  - The phone save bar dropped a theme or note typed in the full editor.

**Bugs found by testing and fixed**:
- **Saving:** activity choices waited 400 ms like typing, so a choice made just before closing could be lost.
- **Explorer:** keyboard selection lost focus.
- **Phone layout:**
  - the Explorer editor and the Map sheet covered content;
  - the step path scrolled sideways.
- **Accessibility:** the brand link and Map labels failed WCAG 2.5.3 (label in name), and the nav group had the same name as the 1.x discoveries list.
- **Readability:**
  - Character pages were about 12,000px tall (now collapsible, with one activity at a time);
  - phrase boundaries were invisible on touch screens.

## Completion criteria

| # | Criterion (from the brief) | Status | Evidence |
| --- | --- | --- | --- |
| 1 | The new dashboard works | Met | `study-dashboard.spec.ts` (start in 2 interactions; Quick/Deep; continue; recent discoveries) |
| 2 | All four primary study modes are functional | Met | Investigations, Scripture Explorer, Character of Christ, Connect with Christ, each with E2E specs |
| 3 | The engine supports varied interactive activities | Met | 9 activity types, each exercised in `study-activities.spec.ts`; pure checking unit-tested against all content |
| 4 | Four difficulty levels | Met | Every core step has easy/medium/hard/complex variants (enforced by the registry); changing level keeps progress (E2E) |
| 5 | Hints and optional side branches work | Met | `study-investigation.spec.ts` (hints, Show me, Continue anyway, branches and return) |
| 6 | 5–10 initial investigations, complete and source-checked | Met; doctrinal sign-off pending | 8 investigations; 0 verification failures; review list for the owner |
| 7 | Discoveries automatically populate the Notebook | Met | Completing an investigation creates or updates its card (E2E) |
| 8 | The Discovery Map reflects actual discoveries | Met | Computed only from cards and personal connections; List view matches stored cards (E2E) |
| 9 | Character of Christ includes meaningful vocabulary exploration | Met | 49 vocabulary words, contrasts, vocab-match/sort/highlight activities (E2E) |
| 10 | Connect with Christ offers distinct short reflection experiences | Met | 15 sessions in 3 rotating formats; no timers, counters, or streaks (E2E) |
| 11 | Local progress survives refreshes and application updates | Met | Reload tests; 1.1→2.0 database upgrade (E2E); additive Dexie v2 |
| 12 | Manual export/import works | Met | Backup format 3 round trip with study data (E2E and unit); formats 1 and 2 import |
| 13 | Themes and accessibility preferences work | Met | 4 themes + System, motion levels, reduced motion (E2E); axe 0 violations |
| 14 | Usable on mobile and desktop | Met in Chromium | Desktop and mobile E2E projects; no overflow at 320–1280 px; real devices untested |
| 15 | Tests and production builds pass, or failures are documented | Met | All checks green; see the table above |
| 16 | Existing functionality and user data are preserved | Met | 1.x E2E suite and 324 1.x unit tests pass; 1.x records untouched; rollback to 1.1 safe |

## Known limitations

- **Untested platforms:**
  - Safari/WebKit and Firefox (their Playwright browsers aren't installed here);
  - real iOS and Android devices;
  - screen readers (VoiceOver, NVDA).

  Roles, names, live regions, and focus were checked by axe and keyboard tests.
- **No sync.** It's one browser on one device; use backups to move data. The data model is sync-ready (stable ids, timestamps, version stamps).
- **Study data is last-write-wins across tabs**, with targeted protections: a completion and card link saved in another tab are kept, and cards are never duplicated. Research notebooks keep 1.1's full conflict detection.
- **Closing a tab at the instant of a tap** could still lose that one tap. Choices save immediately and notes flush on page hide, but 2.0 study text has no localStorage safety copy like 1.x research notebooks have. Firefox may abandon IndexedDB writes started while a page closes. A future release could add one, modeled on `src/persistence/unsaved-copy.ts`.
- **Damaged study records** are never overwritten. The affected screen shows a message, and only a backup import (previewed and confirmed) can replace them. If storage itself is blocked, investigations offer "Study without saving".
- **Overlapping verse ranges** appear as separate Map nodes.
- **Key phrases highlighted from the Key words tab** keep their trailing punctuation, because highlights are whole words.
- **1.1 tabs left open** across the deployment are told to update. They keep working on research notebooks (2.0 doesn't change those records), but their "Delete all data" and replace-import clear only research notebooks, not 2.0 study data.
- **English only.** The verifier relies on the undocumented Gospel Library content service, which may change.

## Incomplete or partial requirements

- **Milestone animations.** Completion views, discoveries, correct connections, and new Map nodes have subtle motion. There is deliberately no separate "milestone" system, to avoid gamification.
- **Browser and device coverage** is limited to Chromium (above).
- **Doctrinal sign-off:** every note is resolved (qualified, corrected, or withheld), but 17 items still await the owner's personal review, and 19 withheld items await a decision on whether to restore them.
- **AI assistance** is an integration boundary with a local fallback only, as the brief specified. No AI provider is connected.

## Commits

**Public history (`main` on GitHub):** the two 1.1 commits that existed locally (`4512d75`, `99d15a2`), plus one squash commit for 2.0, tagged `v2.0.0`. `v1.1.0` tags the 1.1 release candidate. The squash keeps the intermediate development commits out of the public repository, because some of them contained verbatim survey questions (see [Git security](#git-security)).

**Local only:** the branch `v2.0-redesign` keeps the full development history, 24 commits from the foundation to the release preparation. **Never push it.** It's useful for archaeology on this machine; the tag `baseline-1.1-before-2.0` marks where it began.

## How to run and review the app

```bash
git switch v2.0-redesign
npm ci
npm run dev                      # http://localhost:3000 (drafts visible; no service worker)
# or the production build, served the way Atlas serves it:
npm run build && npm start       # http://localhost:3000
```

Suggested review path:

1. **Dashboard**: choose Quick or Deep, then Start an investigation.
2. **Investigation**: work through *One by One* at Medium. Answer wrongly once to see the feedback and hints, change the difficulty from Settings in the player, open a side question, then finish to create a Discovery Card.
3. **Notebook**: open the card, add a note, and use "See on your Map".
4. **Map**: select nodes, open the List view, and add a personal connection.
5. **Scripture Explorer**: highlight a phrase and save it to the Notebook and Map.
6. **Character of Christ**: open Meekness and work through the vocabulary and activities.
7. **Connect with Christ**: try today's session.
8. **Settings**: themes, motion, study preferences, and export a backup.
9. **Research**: open an existing 1.x investigation to confirm it's unchanged.

Checks:

```bash
npm run lint && npm run typecheck && npm test
npm run build && CHROMIUM_PATH=/path/to/chromium npm run test:e2e
npm run verify:study && npm run verify:references   # needs network
node scripts/review-notes.mjs                        # regenerate the review list
```

## Production release

Done on 26 October 2026 with the owner's authorization:

1. **Release preparation:** privacy cleanup, git security check, abuse-help links, and doctrinal review (above).
2. **Verification on the release content:** lint, typecheck, 1,408 unit tests, production build, 201 E2E tests (3 skipped by design), and `verify:study` and `verify:references`, all passing.
3. **Merge:** `v2.0-redesign` was squash-merged into `main`. The pushed range was rescanned for survey text, secrets, and personal information, and was clean. `main` was pushed to GitHub with tags `v1.1.0` and `v2.0.0`.
4. **Rollback preserved on Atlas:** before deploying, the live 1.1 build was copied to `/srv/www/.gospellabs-1.1-20261021044420`, which is never served and survives later deploys. After the deploy it was also kept as `.gospellabs-previous`.
5. **Deploy:** `npm run deploy` (the existing workflow) from a clean `main`.
6. **Live verification:** results below.

LIVE_PLACEHOLDER

### Rolling back

Rolling back to 1.1 is data-safe: 1.1 opens 2.0's version 2 database and ignores the study tables, and research notebooks are untouched. Either:

```bash
# Fastest: restore the preserved 1.1 build on Atlas
ssh atlas 'cd /srv/www && mv gospellabs.softlockedlive.com .gospellabs-rolled-back \
  && cp -a .gospellabs-1.1-20261021044420 gospellabs.softlockedlive.com'
# Or rebuild 1.1 from git
git switch --detach v1.1.0 && npm ci && npm run deploy && git switch main
```

Never roll back to 1.0. More detail is in [docs/HOSTING.md](HOSTING.md).

### Still recommended after release

- Device checks on iPhone Safari (Add to Home Screen, an investigation, offline) and an Android phone.
- A screen-reader pass of one investigation and the Map.
- The owner's review of the 17 *needs-review* items and the withheld content, using [docs/2.0/DOCTRINAL_REVIEW.md](2.0/DOCTRINAL_REVIEW.md).
