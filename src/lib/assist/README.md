# Study assistant boundary

`StudyAssistant` (`types.ts`) is the only way screens ask for optional study
help: explaining a term, more help on an activity, and follow-up questions.
Gospel Labs ships one implementation, `LocalAssistant` (`local.ts`), which
uses curated content only: concept and vocabulary descriptions, an activity's
own hints, "where to look again" guidance, branch questions, and open
questions. `getStudyAssistant()` returns it, and `AI_ASSIST_AVAILABLE` is `false`.

There is no AI provider, API key, or network call, and none may be added in
the browser.

## Rules for any future provider

1. **Server-side only.** Keys and model calls live on a server Gospel Labs
   controls. Never ship a key to the browser or ask learners for one, and never
   store secrets in localStorage, IndexedDB, or backups.
2. **Label everything.** Every response has `provenance: "ai"`, and the UI
   shows it with `<ProvenanceLabel provenance="ai" />`, which reads
   "AI-generated — not doctrine or revelation" (`PROVENANCE_LABELS.ai`).
   Never present generated text as scripture, Church teaching, a speaker's
   words, or the learner's own discovery.
3. **Never write into curated content.** Generated text is never saved into
   `src/content/`, Discovery Card summaries, or connections. If it is ever
   stored with a learner's data, it keeps its "ai" provenance.
4. **No answers.** `moreHelp` may hint or point to evidence; it must not give
   away an activity's answer (that is "Show me", which uses curated text).
5. **Cite, don't invent.** Refer to sources the screen already has (`sourceIds`);
   never fabricate quotations, citations, or doctrinal claims.
6. **Opt-in and offline-safe.** The app must work fully without it; switching
   it on is the learner's choice, and the CSP must be updated deliberately.
