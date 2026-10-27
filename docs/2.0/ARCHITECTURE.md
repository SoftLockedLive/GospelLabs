# Gospel Labs 2.0 — Architecture

This is the integration contract for the 2.0 redesign. Every part of the app
builds on the schemas and modules named here, so content, the investigation
engine, the Notebook, and the Discovery Map can't drift into incompatible models.

## Principles

1. **Local-first, no account, works offline.** All personal data is in this
   browser's IndexedDB; curated content is static JSON compiled into the build.
2. **Preserve 1.x.** The 1.x research notebook (question bank, five-section
   workspace, My Library) keeps working unchanged and is presented as
   **Research**. Its IndexedDB records and backups are never rewritten.
3. **Content is data.** Investigations, attributes, passages, and Connect
   sessions are JSON validated by Zod; no lesson is hardcoded in a component.
4. **Provenance is always visible.** Every explanation is labeled: scripture,
   official Church resource, a speaker's teaching, scholarly analysis,
   "Suggested by Gospel Labs", "You discovered", "Your interpretation", or
   "AI-generated". Nothing app- or AI-generated is presented as doctrine,
   revelation, or the learner's own discovery.
5. **Learning, not gaming.** No XP, scores, streaks, or rankings. Progress
   records what was studied, never how righteous or spiritual someone is.
6. **Elder Corbridge's framework informs the design** ("Stand Forever", BYU,
   22 January 2019): every investigation names the **primary question** it rests
   on, and steps can be tagged with one of his four **methods of learning**
   (scientific, analytical, academic, divine). All begin with a question.

## Learning flow

**Question → Evidence → Interactive Discovery → Understanding → Saved Discovery**

Phases are tags on steps, not mandatory screens. An investigation is a guided
main path of 3–9 steps with optional side branches. Each step has one activity
per difficulty; difficulty changes the kind of reasoning (recognize → explain →
analyze → synthesize), not the number of questions. Quick sessions (10–15 min)
follow the three `depth: "core"` steps (question, big idea, reflection); deep
sessions (25–35 min) add the `depth: "deep"` steps and the side branches.

Completing an investigation automatically creates a **Discovery Card**. Cards
feed both the **Notebook** (as cards) and the **Discovery Map** (as nodes and
edges). The Map is computed from cards plus the learner's personal connections,
so the two always agree.

## Module map

```
src/domain/study/            Pure logic and schemas (no React, no IndexedDB)
  vocabulary.ts              Difficulties, phases, methods, primary questions, source kinds,
                             node kinds, relations, verdicts, provenance labels
  content-schema.ts          Zod schemas for all curated content and the 9 activity types
  content-registry.ts        Merges and cross-validates all content; resolveActivity(); nodeLabel()
  user-data.ts               Zod schemas for StudyProgress, DiscoveryCard, PersonalConnection, Exploration
  connect.ts                 Connect with Christ rotation (+ connect-helpers.ts)
  character.ts, explorer.ts  Attribute links/exploration helpers; passage words and highlights
  notebook.ts, graph-layout.ts  Notebook search/filters; deterministic Map layout
  cards/common.ts            Shared Discovery Card helpers (+ cards/connect.ts)
  cards/investigation.ts     Card from a completed investigation            (engine)
  cards/passage.ts           Card from Scripture Explorer                    (explorer)
  cards/attribute.ts         Card from Character of Christ                   (christ)
  engine/                    Progression reducer, difficulty, hints, branching (engine)
  activities/                Answer checking for each activity type           (engine)
  graph.ts                   buildDiscoveryGraph(cards, connections)          (map)
  suggestions.ts             Dashboard suggestions                            (ui)

src/content/                 Curated content (JSON), one file per item
  concepts.json              Core concept registry (Map nodes)
  investigations/, attributes/, passages/  + index.ts listing every file
  connect/sessions.json
  learner-questions/families.json  Survey theme families (row numbers only; no text)

src/lib/study-content.ts     Loads + validates content at build time. Server-side only:
                             pages pass what clients need as props.
src/lib/preferences.ts       Motion, study length, difficulty, activity options (localStorage)
src/lib/theme.ts             Themes: dark (Lab), light (Daylight), dawn (Parchment), evening, system

src/persistence/
  db.ts                      Dexie v2: investigations (1.x) + studyProgress, discoveries,
                             personalConnections, explorations
  study-repository.ts        Validated CRUD, completeInvestigation(), deleteDiscovery(), snapshot()
  study-hooks.ts             Live React hooks for all study data
  client.ts                  getRepository() (1.x), getStudyRepository() (2.0)
  backup.ts                  Backup format v3 (adds study data and preferences)

src/components/study/
  activities/                ActivityRenderer + one component per activity type (engine)
  player/                    Investigation player                               (engine)
  ...                        Feature folders: dashboard, explorer, character, connect, notebook, map

src/app/                     Routes (all statically exported)
  /                          Dashboard
  /investigate, /investigate/[id]      Guided investigations
  /explore, /explore/[id]              Scripture Explorer
  /character, /character/[id]          Character of Christ Builder
  /connect                             Connect with Christ
  /notebook (?card=id)                 Discovery Notebook
  /map (?node=kind:id)                 Discovery Map
  /questions, /library, /investigations/*   1.x Research (unchanged)
  /settings
```

## Data

### Content (static)

See `content-schema.ts` for every field. Key rules:

- **Sources** are declared inline in each content file with globally unique ids.
  A source used in several files must be declared identically (tests enforce it).
  `kind` is one of scripture / official / speaker / scholarly and is always shown.
- **Scripture verse text** may be included (max 12 verses per source) and must
  match the original word for word (`npm run verify:study`). Get it with
  `node scripts/scripture.mjs verses "<url>"`; never type it.
- **Quotations** — any text in “curly double quotes” — must appear verbatim in a
  source the same file declares. ‘Single curly quotes’ mark a word being discussed.
- **Map connections** (`connections` on steps and passages) always cite at least
  one source. Node refs are `"kind:id"`: `scripture:<sourceId>`, `concept:<id>`,
  `vocabulary:<id>`, `attribute:<id>`, `investigation:<id>`, `question:<id>`
  (`question:primary-god|christ|joseph|kingdom`, an investigation id, or a branch id).
- **Review**: each investigation, attribute, and passage has `review.status`
  (`verified` | `needs-review`) and `review.notes` listing anything uncertain,
  disputed, or interpretive for the project owner.
- A file containing `{"placeholder": true}` is skipped until written. The test
  "has no placeholder files left" is the release gate.

### Personal data (IndexedDB, Dexie v2)

| Table | Record | Key |
| --- | --- | --- |
| `investigations` | 1.x research notebook (unchanged) | uuid |
| `studyProgress` | `StudyProgress`: difficulty, length, position, step states, visited branches, discoveryId | investigation content id |
| `discoveries` | `DiscoveryCard`: origin, sources, concepts, connections (demonstrated/suggested), highlights, notes | uuid |
| `personalConnections` | `PersonalConnection`: a learner-made Map edge with a required note | uuid |
| `explorations` | `Exploration`: attribute/passage/connect activities, vocabulary, highlights, last opened | `kind:contentId` |

Conventions (sync-ready): stable random ids, `createdAt`/`updatedAt`, a
`dataVersion` stamp (`STUDY_DATA_VERSION`), loose objects that keep unknown
fields, new fields only with defaults, and repositories that refuse to overwrite
records from a newer version. Study records are last-write-wins.

**Migration:** version 2 only adds tables; no data migration runs, and 1.x
records are untouched. Dexie 4 opens a database at a higher version than it
declares, so 1.1 (or a rollback to 1.1) still opens it (tested).

**Backups:** format version 3 = version 2 + `study` (the four new tables) +
`preferences`. Versions 1 and 2 import unchanged (migration adds an empty
`study`). 1.1 refuses version 3 files rather than dropping data.

### Step state and progression

`StudyProgress.steps` is keyed by step id, or `branchId/stepId` inside a branch.
Each `StepState` records status, difficulty, attempts, hints shown, whether the
answer was revealed or the step skipped, the last response, and optional
reflection. Changing difficulty never discards completed steps; only unfinished
steps switch to the new level. Entering a branch stores `returnTo`; leaving it
restores the main-path position.

### Engine rules (as implemented)

- **Skip and reveal.** "Continue anyway" marks a step skipped: it counts as done for progress but adds no sources, concepts, or connections to the Discovery Card. "Show me" completes the step with the answer shown; its concepts and connections are recorded as *suggested*, not *discovered*.
- **Difficulty changes** never undo completed steps. Unfinished steps (including skipped ones) reset to the new level, so revisiting starts fresh.
- **Side questions** are offered in deep sessions (and when "offer side questions" is on), after the step that offers them is done.
- **Completion is explicit:** the card is created when the learner chooses "See your discovery" on the last step; finishing again updates the same card (notes kept).
- **Content version changes** keep step states whose ids still exist and drop the rest (`engine/progress.ts`), but only when the stored progress is *older* than the content. Progress saved against *newer* content (an old tab, or a rollback) is shown read-only and never saved over.
- **Unreadable progress** (a record that fails validation) is never replaced: the start screen explains it and offers only "Study without saving".
- **Re-completing accumulates discoveries:** sources, concepts, and connections from earlier runs are kept, and anything once demonstrated stays demonstrated. A missing card link is resolved by origin, so finishing again never creates a duplicate card, and a completion saved by another tab is kept.
- **Restored activities** keep their answer and attempt count; marks from the last check aren't shown again.
- **Option order** is shuffled deterministically per activity, so authored order never reveals answers.

### Incorrect answers

1st wrong attempt → feedback that points at evidence (option `feedback`, pair
`clue`, highlighted source), never the answer. Then hints in order (each
`hints[]` entry is progressively clearer). **Continue anyway** (skip; the step
can be tried again later and adds nothing to the card) is offered from the
start. After 2 checked attempts, or 1 once every hint has been shown, the
learner may **Show me** (reveal with explanation; connections recorded as
*suggested*). Nobody gets stuck; nothing is punished. (Since 2.2; see
`src/domain/study/engine/hints.ts`.)

## Activity contract

`src/components/study/activities/types.ts` defines `ActivityRendererProps`:
hosts pass the activity, its sources (resolved from content), optional saved
state, and callbacks (`onStateChange`, `onComplete`). Activities never import
content or storage. Answer checking is pure (`src/domain/study/activities/`)
and unit-tested.

## Preferences

`src/lib/preferences.ts` (localStorage `gospel-labs:preferences`): motion
(`system|full|subtle|off`, applied before paint as `<html data-motion>`;
`system` = `off` under prefers-reduced-motion, else `subtle`), study length,
default difficulty, and activity options (offer branches, show reflections,
suggest difficulty). Theme keeps its 1.x key `gospel-labs:theme`.

CSS should animate only under `[data-motion="full"]` / `[data-motion="subtle"]`
and never under `[data-motion="off"]`.

## Optional AI boundary

`src/lib/assist/` defines a `StudyAssistant` interface (explain a term, offer
another hint, suggest follow-up questions). The shipped implementation is a
**local, non-AI assistant** built from curated content. No AI provider, API
key, or network call exists; the CSP blocks third-party requests anyway. A
future provider must run server-side and every response must be labeled
"AI-generated — not doctrine or revelation" and never be saved into curated content.

## Conventions for contributors (including parallel agents)

- Use the shared vocabulary, schemas, and helpers above; don't define parallel types.
- Stay inside your files (see the ownership table in the release report).
- Use theme tokens (`bg-surface`, `text-fg`, `text-muted`, `border-line`,
  `bg-accent`, …), never raw colors. Touch targets ≥ 44px; visible focus;
  keyboard operable; announce changes with `aria-live`.
- Don't import `@/lib/study-content` in client components; pass props from pages.
- Static export: dynamic content routes use `generateStaticParams`; personal
  data ids use query parameters.
