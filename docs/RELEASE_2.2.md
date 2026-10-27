# Gospel Labs 2.2.0

A **minor** release under [VERSIONING.md](VERSIONING.md): app fixes and changes made to get Gospel Labs ready for other people to use. **No study content changes:** the content pass is held back for the owner's review and a later content update (see *Held back for a content update*). **Not yet pushed or deployed.**

## How it was found

Before the fixes, five reviews went through the 2.1.0 build:
- **A freshman on a phone:** short sessions, a short attention span, little patience for walls of text. (The intended learner is a high-school freshman with a very short attention span; a second pass with that learner followed.)
- **An adult teacher on a laptop and tablet:** Hard and Complex levels, citations checked, backup round trip, larger text.
- **Returning learners:** 1.0 and 1.1 research notebooks in every old shape (including the reported Notebook glitch), backups from 1.0 to 2.0, and heavy 2.0 data.
- **An automated sweep:** every page at six screen sizes in all four themes, axe (WCAG 2.2 AA) on 56 pages and states, keyboard walks, 200% zoom, and reduced motion.
- **A read of all content and wording:** terminology, hints, difficulty, length, typography, and internal consistency.

## The Notebook glitch with old notebooks

On phones, a 1.x research notebook with a long untitled question (or a pasted link as its title) made the "From your research notebooks" cards wider than the screen. The page scrolled sideways, and on Android Chrome the bottom tab bar was pushed partly off screen too. The cause was a grid whose single column grew to fit a line that couldn't wrap.
- **Fix:** that grid, and every other grid with the same pattern (about 30 components), now has a column that can shrink.
- **Guard:** the main area clips anything still too wide, so a future mistake can't move the tab bar.
- **Test:** the responsive test now has 1.x notebooks with long, unbreakable titles on the device. It looks for any element wider than the screen, not just page scrolling.

The same pattern affected My Library and the notebook editor with a pasted-link title; both are fixed.

## What changed for learners

**For a high-school freshman with a short attention span** (from a second review as a 14–15-year-old on a phone)
- **A few minutes is enough:** "Only a few minutes? Spend them with the Savior" sits on the first screen of the dashboard and opens Connect with Christ. Even a quick investigation takes 20–30 minutes.
- **The first suggestion is the shortest investigation.** Before, every investigation scored the same, so the longest and most abstract one was always first.
- **"Continue studying" goes straight back to the step,** not to the overview with its introduction.
- **After each step:** "A good place to stop if you need to. Your place is saved for next time."
- **Never stuck:** "Continue anyway" is there from the start (a skipped step can be tried again later), and "Show me" comes after two tries, or one once the hints are used. Before, both waited for three wrong checks.
- **Level choice:**
  - New learners start at **Easy** instead of Medium.
  - The level and session length a learner starts with are remembered for the next investigation.
  - The levels are described in plain words: "Spot it in the verses", "Connect the pieces", "Weigh what the sources say", "Put it all together".
- **Less to scroll past:**
  - On phones, a step's takeaway is clamped to three lines ("Read more"), so "Next step" is closer.
  - The phase and method chips are hidden on phones.
  - **The end of an investigation is a short celebration:** "You finished the investigation!", "Saved to your Notebook.", the big idea, and the concepts. The full report is one tap away ("See everything you found"); it went from about 6.3 phone screens to 1.5.
  - **Character of Christ** shows the attribute tiles first (from 10.4 phone screens to 3.5). Each attribute has a "Try an activity" button, and on phones its long lists start collapsed ("Show N …"). Abuse-safety notes are never collapsed.

**Fairer activities**
- Answer choices are shuffled; before, the right answer was listed first in 128 of 129 questions. A test now fails if the first option is correct more than half the time.
- Feedback no longer reads like a score ("Two still need another look", not "3 of 5").

**Your words are kept**
- A reflection written in an investigation goes into its Discovery Card's notes, and so does the private note on a Character of Christ page.
- Nothing already in the notes is lost or repeated.

**Phones and small screens**
- **Investigation steps:**
  - "Build the principle" no longer squeezes pieces to one word per line.
  - Six steps fit a 360px screen.
  - The phase chip lost its number ("3 Discovery" read as a step count).
- **Tabs and the Map:**
  - Explorer and Character tabs wrap instead of hiding the last tab.
  - Map labels stay readable when zoomed out, and the Map's kind filters sit behind a Filter button on phones.
- **Character of Christ:** the "Keep what you've studied" card no longer overflows at tablet widths.

**Getting in and out**
- Begin or Resume sits right under an investigation's question instead of about three screens down.
- The browser's Back button returns from the steps to the overview instead of leaving the investigation.
- The duplicate "Return to the investigation" button is gone.
- Finishing the tour from the welcome card finishes the welcome.
- Restoring a backup on a new device skips the new-learner welcome and restores its preferences by default.

**Time and dates**
- Dates follow the learner's own time zone: evening study was dated tomorrow, and backup files were named with the UTC date.
- Time estimates are honest:
  - Measured from the content by `scripts/estimate-study-time.mjs`, a quick study takes about 20–30 minutes and a deep one 30–40, not "5–10".
  - A test keeps each investigation inside the labels.
  - The Investigate page says you can stop after any step.

**Returning learners**
- **Notebook:**
  - It waits for research notebooks before choosing what to show; it used to flash "Your Notebook grows as you study" at 1.x learners.
  - With insights but no cards yet, a learner gets a short note and a search box.
  - It links to My Library, including for 1.0 learners with no saved insights.
  - It returns to the same scroll position after a research notebook is opened from it.
- **What's new:** it keeps the 2.0 notes for a 1.x learner until dismissed. Before, opening the Map or studying first made them disappear.
- **Preferences:** only what was changed is stored. Before, merely opening the Map saved every default as if chosen, and backups carried those defaults to other devices.
- **Dashboard:** no longer jumps when research notebooks load.
- **Service worker:** no longer requests about 37 malformed URLs (all 404s) on every update.

**Clearer words**
- "Investigation" now means only the guided studies; 1.x items are "research notebooks" everywhere. "Discovery" means only Discovery Cards (1.x saves are "insights").
- Save, open, and dismiss buttons use one set of words, and Map is capitalized throughout.
- The Notebook no longer claims passages and attributes are saved automatically.
- "Clue Investigation" is "Follow the Clues".
- The changelog and tour no longer use internal names.
- After a right answer, the explanation is one tap away ("Why it fits"), so the step's takeaway isn't buried. After "Show me" it stays open.
- Per-item notes say "Why" instead of repeating "Suggested by Gospel Labs" six times; screen readers still hear who wrote them.
- Source cards no longer print the speaker and title twice.
- Curly apostrophes and unspaced em dashes in the app's own text (study content follows in the content update).

**Accessibility**
- Focused controls no longer scroll in under the sticky header or the phone tab bar (scroll padding below `lg`).
- Focus is no longer lost to the page:
  - after a wrong check, when the last hint replaces its button, after "More help", on every phone match pick, after deleting a Map connection, and after closing the welcome or What's new;
  - affected names now keep focus or move it to the new help or heading.
- The "Save insight" button's name contains its visible text.
- Sort choices meet the 24px target spacing at 320px.

## Held back for a content update

Every investigation, attribute, passage, and Connect session was also reviewed and revised. Those changes are **not in 2.2.0**: the owner hasn't reviewed them, and some touch doctrine or the abuse-safety notices. They are saved, committed, on the local branch **`content-2.2.1`** (commit `3c60191`, based on 2.1.0; rebase it onto 2.2.0 before use). It holds:
- **Hints:** about 40 final hints stated the answer while still crediting "You discovered"; they now point to a place without naming it.
- **Verdicts:** one rule everywhere (supported / contradicted / goes beyond); several verdicts changed.
- **Answers and levels:**
  - answers that rested on words the learner couldn't see;
  - plausible wrong options instead of strawmen;
  - Easy, Medium, Hard, and Complex put in order.
- **Factual corrections:**
  - Enos's guilt "had been" swept away, not "could be";
  - D&C 18:11 vs 19:16;
  - the Father is named five times in 3 Nephi 27:13–15;
  - Acts 4:12 vs Mosiah 3:17;
  - Matthew 16:15 is addressed "unto them";
  - 1 John 4:18;
  - Isaiah 53:7;
  - a Connect citation (Matthew 20:20–22);
  - D&C 19 was given through Joseph Smith to Martin Harris.
- **Length, wording, and style:** trimmed text and house style (see the content guide changes on that branch).
- **Safety notices:** "a trusted adult or leader" became "someone you trust, such as a parent, friend, Church leader, or counselor". For a high-school audience the owner may prefer to keep "trusted adult".
- **Review records:** 41 "Needs owner review (2.2)" notes and a regenerated DOCTRINAL_REVIEW.md listing what to check.

On top of 2.2.0's app changes, that branch passed `npm run verify:study` online (2,666 quotations, 0 failures), the unit tests, and the end-to-end tests.

The only content change in 2.2.0 is each investigation's `estimatedMinutes`, measured by `scripts/estimate-study-time.mjs` (numbers only).

## For the owner

1. **Quick is too long for a high-school freshman.** Measured honestly, a quick study takes 20–30 minutes (it was labeled 5–10), and Deep adds only a few minutes because nearly every step is a core step. 2.2.0 relabels it honestly and makes stopping after any step easy. The real fix belongs in the content update: choose the three or four essential steps in each investigation (`depth: "deep"` on the rest), and check that each Discovery Card still holds.
2. **Review the content pass** on `content-2.2.1` before it ships. Start with the "Needs owner review (2.2)" notes in its DOCTRINAL_REVIEW.md:
   - verdict changes;
   - new statements and answers;
   - the changed safety-notice phrase.
3. **Permissions-Policy header.** Every page logs a console warning about `interest-cohort`. It comes from the Caddyfile on Atlas, mirrored in `scripts/security-headers.mjs`. Removing it is a one-line infrastructure change; it is harmless to leave.
4. **Not done (polish):**
   - a scroll hint on long step paths at 320px;
   - a small dashboard shift when "Pick up where you left off" loads;
   - the 404 and "notebook not found" pages could share one style.

## Tests

- **Lint and typecheck:** clean.
- **Unit tests:** **1,447 passed** (66 files). New ones cover:
  - choice shuffling (stable order, not as written; across all real content, the first option is right less than half the time);
  - reflections and private notes on Discovery Cards (added once, never replacing the learner's own notes, and growing notes replace their earlier copy);
  - dates in the learner's time zone;
  - preferences storing only what changed, and Easy as the default;
  - recognizing 1.x devices that opened the Map;
  - "Continue anyway" from the start and "Show me" after two tries;
  - the source line not repeating the label;
  - quick sessions suggesting the shortest investigation;
  - time estimates inside the session labels;
  - which Character of Christ lists may collapse (never safety notes).
- **Content (unchanged apart from time estimates):** `npm run verify:study` passes online: 351 sources, 2,721 quotations, 0 failures, and no survey text.
- **End-to-end (desktop and mobile Chromium, production build):** **235 passed, 3 skipped (by design)**. New or extended:
  - phones at 320px with 1.x notebooks with long, unbreakable titles, including My Library and the notebook editor; any element wider than the screen fails;
  - the few-minutes link on the dashboard's first screen;
  - "Continue studying" going straight to the step;
  - Back from the steps returning to the overview;
  - a new learner starting at Easy, and the chosen level and length carrying over;
  - "Why it fits" and "Read more";
  - the short completion card;
  - Character of Christ tiles first, collapsed lists on phones with safety notes always visible;
  - restoring a backup on a new device;
  - focus after finishing the welcome tour.

## To release

The work is committed on the local branch `release-2.2-prep` (not pushed). When the owner approves:

```bash
git switch main && git merge --ff-only release-2.2-prep
git tag -a v2.2.0 -m "Gospel Labs 2.2.0"
npm run build && npm run test:e2e               # the deployed build is the tested one
git push origin main v2.2.0
SSH_AUTH_SOCK=/run/user/1000/ssh-agent.socket npm run deploy   # the agent variable only for agent sessions
npm run verify:production
```

Rollback: [HOSTING.md](HOSTING.md) (`.gospellabs-previous` will hold 2.1.0).
