# Gospel Labs 2.2.0.1

A **patch** under [VERSIONING.md](VERSIONING.md), and the first release with four-part version numbers. Quick studies are now three steps, about 10–15 minutes. The owner numbered it as a patch: no wording changed, only which steps make up a quick study. **Not deployed yet** (see *Release*).

## Shorter quick studies

A quick study was five or six of an investigation's six or seven steps, and took 20–30 minutes. That's too long for a high-school freshman with a few minutes. Each quick path is now three steps:
1. the opening question;
2. the step whose insight gives the big idea, which the end screen shows;
3. the closing reflection.

Everything else is still in a deep study.

| Investigation | Quick path | Now only in a deep study | Quick (min) | Deep (min) |
| --- | --- | --- | --- | --- |
| Again and Again | What the son expected → “As often as my people repent” → Coming back to Him | Weakness and sin; How does God show forgiveness? | 25 → 10 | 40 → 35 |
| Christ at the Center | What He called “my gospel” → “None other name” → Talk of Christ | Sent by the Father; The trunk and the branches | 25 → 15 | 40 → 35 |
| Loved Ones Beyond the Veil | Everyone lives on → The gospel reaches beyond death → In His hands | Ordinances for those who have died; Judged by works and the desires of the heart; What we know, and what we leave to God | 25 → 10 | 35 → 35 |
| Fear and Friendship | Two teachings side by side → One word, two meanings → Approaching Him as a friend | A sermon to His friends; Love that casts out fear; Friends who revere Him | 25 → 15 | 30 → 30 |
| One by One | For all—and for each → What these passages say, and what they leave unsaid → Bring it to Him | What He took upon Him; Why: to know how to succor; One by one | 30 → 15 | 35 → 30 |
| Primary Questions First | Not all questions are equal → Experiment upon the word → Whom say ye that I am? | Four ways of learning, one beginning; Can you learn the truth by elimination? | 20 → 10 | 30 → 25 |
| Recognizing the Spirit | Wind, earthquake, fire — or a still small voice? → In your mind and in your heart → Listen for Him | What does it invite you to do?; He shall testify of me | 20 → 10 | 30 → 30 |
| When Faithful People Suffer | “Who did sin?” → “O God, where art thou?” → Who is with you | He descended below them all; Strength to bear it | 25 → 10 | 35 → 30 |

**What changed in the content:** only each step's `depth` and each investigation's `estimatedMinutes`. No wording, answer, verdict, source, or safety notice changed. `contentVersion` isn't raised, so nobody's progress resets.

**Discovery Cards still hold up:** a quick study's card gets 3–6 Map connections and 5–9 concepts in every investigation.

**Partway through a quick study:** learners resume at their next step on the shorter path. Before this release, someone saved on a step that's now deep-only would have reopened that step while the step path showed the next one as current. Resuming now moves them on. Their work on that step is kept for a deep study.

**Time estimates** are honest about what's on screen:
- `scripts/estimate-study-time.mjs` now counts the question, hook, and intro, every step, and the big idea on the end screen.
- It no longer counts reading a learner has to open or scroll to: the common questions and "the question beneath this one" below Begin, and the full write-up behind "See everything you found".
- The session labels follow: Quick study (10–15 min), Deep study (25–35 min).
- The session choice now says "3 steps: the heart of the investigation."

## Four-part version numbers

Versions are now **MAJOR.MINOR.CONTENT.PATCH**. **PATCH** is for a small one-off bug fix, and it's deployed quietly:
- **No What's new.** A device that has seen everything but patches gets nothing. Patches are never listed in the card.
- **No update notice** in a tab open across the deploy, when only PATCH differs. The fix arrives the next time Gospel Labs loads.
  - Tabs still running 2.2.0 or earlier don't know this rule, so they'll show it once for 2.2.0.1, with its own notes ("Shorter quick studies").
- **Settings › About** lists every release, patches included, as "Small fix".

Releases up to 2.2.0 keep their three-part numbers. A three-part number reads as PATCH 0. From 2.2.0.1 on, the changelog tests require four parts. `package.json` holds `2.2.0.1` (npm accepts it for a private package), and the tag is `v2.2.0.1`.

## What learners see

- **A device on 2.2.0** gets nothing: it's quietly marked current. Its quick studies are just shorter.
- **Older devices** get the full What's new for 2.2.0 and earlier releases, headed "Gospel Labs has been updated to 2.2.0.1". The patch isn't listed there.
- **New learners** get the welcome, as before.
- **Settings › About** lists "2.2.0.1 · Shorter quick studies" as a small fix.

## For the owner

**Review the quick paths in the table above.** These calls are the ones most worth a look:
- **Loved Ones Beyond the Veil:**
  - "What we know, and what we leave to God" is now Deep-only, and so are ordinances and "the desires of the heart".
  - Quick still opens with the hook "Scripture doesn't map out anyone's future".
  - In Quick, "The gospel reaches beyond death" says the dead "choose for themselves".
- **Christ at the Center:** "Sent by the Father", which places the Father in the picture, is Deep-only.
- **One by One:** Quick goes from "for each" straight to "what these passages leave unsaid" about how. "Why: to know how to succor" is Deep-only.
- **Primary Questions First:** Quick keeps Alma's experiment, which a freshman can act on. "Can you learn the truth by elimination?" (revelation, through Peter) is Deep-only.
- **When Faithful People Suffer:** "Strength to bear it" is Deep-only. The safety-related lines are unchanged:
  - the reflection's "Asking God for help, and asking people you trust, can go together" is still in Quick;
  - the Gospel Topics step on adversity was already Deep-only.

To swap a step, change its `depth` (exactly three `core` steps per investigation), then run `node scripts/estimate-study-time.mjs --write` and `npm test`.

**The held-back content pass** is still on the local branch `content-2.2.1`, for the content update 2.2.1.0 after your review. Rebase it onto `v2.2.0.1`:
- expect conflicts in each investigation's `estimatedMinutes`;
- keep this release's `depth` values;
- then re-run the estimator.

## Tests

- **Lint and typecheck:** clean.
- **Unit tests:** 1,454 passed. New:
  - four-part versions and three-part ones reading as PATCH 0;
  - the kind check, and four parts required after 2.2.0;
  - patches left out of What's new;
  - quiet update notices only when PATCH alone differs;
  - resuming a quick session from a step that's now deep-only.
- **Content:** `npm run verify:study` passes online, with the same totals as 2.2.0: 351 sources, 2,721 quotations, 0 failures, and no survey text.
- **End-to-end** (desktop and mobile Chromium, production build): 237 passed, 3 skipped (by design), and 2 failed in the full run. The two failures were whole-site sweeps (every page at 320px, and the Daylight accessibility check) that ran while the machine was under heavy load (load average about 12). Both passed on rerun.
  - New: a device on the release before gets only what changed since (the one-line note for a content release), and a device that has seen everything but a patch gets nothing and is marked current.
  - Updated for the shorter paths: the Vocabulary Matching activity test now uses Again and Again's second quick step, and "Continue anyway" moves on to "Who is with you".

## Release

Not done yet. On the owner's go-ahead:
1. Fast-forward `main` to `release-2.2.0.1` and tag `v2.2.0.1`.
2. Run the survey-text check on the commits being pushed.
3. Push `main` and the tag only.
4. Run `npm run deploy`, then `npm run verify:production`.

**Rollback:** `.gospellabs-previous` would hold 2.2.0. No stored data format changed, so going back is safe for learners' data.
