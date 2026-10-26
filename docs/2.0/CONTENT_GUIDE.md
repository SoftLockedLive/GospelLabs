# Gospel Labs 2.0 — Content guide

How to write investigations, Character of Christ attributes, Scripture Explorer
passages, and Connect with Christ sessions. The schema is in
`src/domain/study/content-schema.ts`; a small complete example is
`SAMPLE_INVESTIGATION` in `src/domain/study/test-fixtures.ts`.

## Accuracy and doctrinal integrity (non-negotiable)

1. **Never invent** scripture text, quotations, citations, doctrinal claims, or
   historical facts. If you can't verify it, leave it out or flag it.
2. **Copy, don't type.** Verse text: `node scripts/scripture.mjs verses "<url with id=pX-pY>"`.
   Check a quotation: `node scripts/scripture.mjs find "<url>" "<words>"`.
   Check a link: `node scripts/scripture.mjs title "<url>"` (the canonical URL must equal the request).
3. **Run `npm run verify:study`** before calling content done. Every source,
   verse, excerpt, and quotation must pass.
4. **Keep layers distinct**, and label them with the source `kind`:
   - `scripture` — the standard works (Bible, Book of Mormon, D&C, Pearl of Great Price).
   - `official` — Church-published resources: Gospel Topics, Guide to the Scriptures,
     Bible Dictionary, manuals (e.g. *Preach My Gospel*), proclamations, *The Living Christ*.
   - `speaker` — an individual's talk: General Conference, BYU devotionals. Present as
     "Elder X taught…", not as scripture.
   - `scholarly` — historical or scholarly analysis (use sparingly; prefer Church History
     Topics and the Joseph Smith Papers, which are official).
   - Text the app writes (`insight`, `explanation`, `discovery.summary`) is shown as
     "Suggested by Gospel Labs". Write it as careful observation of the sources
     ("Alma says…", "These verses suggest…"), not as authoritative pronouncement.
5. **State only what sources state.** Where scripture is silent (e.g. *how* the
   Atonement reaches each person), say so plainly. Compare Perspectives activities
   are the place to practice telling "supported" from "goes beyond".
6. **Flag for review** in `review.notes` anything that is interpretive, debated,
   sensitive, or depends on a speaker rather than scripture or official sources.
   Use `review.status: "needs-review"` if any note concerns doctrine itself.
7. **Short quotations only.** Up to 12 verses per scripture source; excerpts from
   talks ≤ ~60 words. Link to the original for everything else.
8. **Links:** Church content must use `https://www.churchofjesuschrist.org/study/...?lang=eng`
   (scripture links with `&id=pX-pY#pX`). BYU speeches: `https://speeches.byu.edu/talks/...`.
9. **Reverence.** Write about the Father, the Son, and the Holy Ghost with care.
   Never imply the app can measure faith, worthiness, or spiritual experiences.
   Never ask learners to report feelings. Reflection is always optional.
10. **Learner privacy.** Never quote or closely paraphrase the learner survey, and never describe an
    individual response ("A learner asked…"). Pose questions in general terms ("Many people wonder…").
    `commonQuestions` lists 1–3 such general questions. `npm run verify:study` fails on any survey text.

## Writing activities that require thinking

Each core step needs four activities (easy / medium / hard / complex) that ask
for **different kinds of reasoning**, not more of the same:

| Level | Reasoning | Good activity types |
| --- | --- | --- |
| Easy | Recognize and identify | `highlight`, `sort`, simple `vocab-match`, `evidence-connect` with clear pairs |
| Medium | Explain and connect | `evidence-connect`, `scripture-connect`, `clue`, `vocab-match` with examples |
| Hard | Compare, analyze, apply | `compare` (supported / goes beyond / contradicted), `scripture-connect`, `clue` with subtle options |
| Complex | Synthesize sources, weigh nuance | `build-principle` across several sources, `compare` with nuanced perspectives, multi-question `scripture-connect` |

- Rotate activity types across steps; don't repeat one type throughout.
- Distractors must be plausible and teach something when chosen (`feedback`/`clue`
  points back to the evidence without giving the answer away).
- `hints`: 2–3, each clearer than the last; the last nearly gives it away.
- `explanation`: why the answer is right, citing the evidence.
- Avoid trivia (verse numbers, names) unless it matters for understanding.
- Avoid long typing. Use a `reflect` activity (always optional) for personal application.
- Highlight `chunks` must join (with single spaces) to the exact verse text. Split
  at natural phrase boundaries (commas, semicolons).

## Map connections

Add `connections` to steps for the relationships the step demonstrates. Prefer
few, meaningful edges (2–4 per step at most). Each cites its sources and has a
one-sentence `note`. Don't add connections just to grow the graph.

## Structure of a strong investigation

1. **Question** (phase `question`): open with the learner's question; maybe a quick
   `sort` or `compare` of common assumptions.
2. **Evidence** (`evidence`): 1–2 steps closely reading key passages.
3. **Discovery** (`discover`): connect passages and teachings; build the principle.
4. **Understanding** (`understand`): apply or synthesize; end with an optional reflection
   pointing to Jesus Christ.
5. **Branches**: 1–3 side questions learners actually asked (from the survey family),
   each 1–2 steps, offered at the step where they arise.
6. **Discovery summary**: what the evidence shows, key ideas, how it points to Christ,
   and honest open questions.

Use methods of learning (Corbridge) where they fit: `academic` for close reading,
`analytical` for weighing evidence, `scientific` for "try it" invitations (e.g.
Alma 32), `divine` for prayerful reflection. Not every investigation needs all four.
