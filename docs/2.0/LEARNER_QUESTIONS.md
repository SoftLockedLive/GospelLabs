# Learner questions: analysis and backlog

Source: `Gospel Question (Responses).xlsx`, a Google Form export with one sheet
("Form Responses 1") and two columns: a timestamp and the response to
"Please write that concern or question below." It holds **128 anonymous
responses** (spreadsheet rows 2–129) submitted between 4 and 18 September 2026.
There is no separate answer column: each "response" is a learner's question or
concern. The PDF copy of the sheet shows the same data (page 1 truncates long
responses), so the `.xlsx` is the source of truth.

## Where the data lives

The repository is public, and several responses are personal (relationships,
temptation, family members, feeling pressured to believe). So:

- **Verbatim data stays out of git.** `npm run learner-questions -- "<path to .xlsx>"`
  (scripts/import-learner-questions.mjs) writes `data/private/learner-questions.json`
  (every response verbatim, with row number and timestamp) and
  `data/private/BACKLOG.md` (the categorized backlog below, with full text).
  `data/private/` is git-ignored and must never be committed. The original spreadsheet is not modified.
- **Committed:** `src/content/learner-questions/families.json`, which holds theme families, row
  numbers, and observations, but no response text.
- **In the app:** nothing from the survey is shown. Each investigation lists a few
  "Questions people ask" (`commonQuestions`), written in general terms by Gospel Labs,
  and its text speaks of common questions rather than individual learners.
  `npm run verify:study` fails if any content contains survey text (any run of 7 words
  from a response), and the release history was checked the same way before pushing.

## Theme families

All 128 rows are assigned to exactly one family (verified by the import script).

| Family | Rows | Count | 2.0 investigation |
| --- | --- | ---: | --- |
| Trials, suffering, and fairness | 7, 16, 18, 22, 33, 37, 74, 78, 87, 90, 108, 113, 118 | 13 | **when-faithful-people-suffer** |
| Knowing the gospel is true | 5, 11, 25, 70, 71, 101, 104, 123, 125, 129 | 10 | **primary-questions** |
| Feeling and recognizing the Spirit | 4, 13, 24, 27, 40, 59, 76, 81, 112 | 9 | **recognizing-the-spirit** |
| Missions, patriarchal blessings, readiness | 15, 65, 67, 80, 82, 86, 100, 116, 117 | 9 | backlog |
| Creation, science, and other worlds | 10, 14, 32, 44, 45, 50, 52, 63, 85 | 9 | backlog |
| Commandments and Church practices | 36, 38, 75, 95, 106, 107, 127 | 7 | backlog |
| Life direction and unclear responses | 6, 9, 23, 26, 31, 93, 96 | 7 | not suitable |
| Repentance and repeated mistakes | 62, 89, 91, 111, 124, 126 | 6 | **again-and-again** |
| Worthiness and being "good enough" | 53, 56, 64, 94, 99, 105 | 6 | branch of again-and-again |
| Scripture study and connecting with the Savior | 47, 54, 58, 84, 102, 103 | 6 | shaped Connect with Christ and Character of Christ |
| Church history and hard questions | 8, 17, 48, 66, 73 | 5 | approach covered by primary-questions |
| Families and loved ones after death | 2, 29, 30, 69, 109 | 5 | **families-beyond-the-veil** |
| Sharing the gospel and ministering | 28, 34, 57, 115, 120 | 5 | backlog |
| Imperfect people and criticism | 35, 77, 97, 119, 128 | 5 | backlog |
| Jesus Christ and the Godhead | 12, 19, 88, 121 | 4 | **christ-at-the-center** |
| Eternity, judgment, and exaltation | 41, 42, 72, 79 | 4 | backlog |
| Women, priesthood, and sealing | 55, 68, 98, 114 | 4 | backlog (needs owner review) |
| Prayer and answers | 49, 110, 122 | 3 | backlog (next release) |
| The Second Coming | 3, 61, 92 | 3 | backlog |
| Temptation and relationships | 39, 43, 46 | 3 | not planned (better served by trusted adults) |
| How the Atonement can be personal | 21, 83 | 2 | **one-by-one** |
| Scripture curiosities | 20, 51 | 2 | Scripture Explorer candidates |
| Fearing God and friendship with God | 60 | 1 | **fear-god-friend** |

## Patterns

- **Repeated themes.** Hardship and fairness are the largest group, then certainty
  (knowing it's true) and the Spirit. Together with repentance, worthiness, prayer,
  and the personal reach of the Atonement, 49 of 128 responses (38%) are really
  asking "Is God there, and does He still care about me?"
- **Misconceptions worth addressing gently.**
  - The Spirit is always a strong emotion (3 Nephi 9:20 describes people who received it "and knew it not").
  - Obedience should prevent hardship.
  - Repeated sin exhausts God's forgiveness (Mosiah 26:30; Moroni 6:8).
  - Imperfection itself is sin (Ether 12:27 distinguishes weakness).
  - "Fear God" means being afraid of Him.
- **Genuine uncertainties to respect.**
  - Why spiritual experiences vary.
  - Why particular people suffer.
  - What becomes of specific loved ones.
  - Unrevealed details about creation and other worlds.

  Content should say plainly where scripture is silent.
- **Learning opportunities.** Most themes lead naturally to Jesus Christ: He
  succors in trials, forgives again and again, knows each person, and calls His
  disciples friends.

## Why these eight

Selection criteria: what genuinely matters to learners (family size and
intensity), suitability for real scripture investigation, a variety of doctrines,
support for four depths of reasoning, and a clear connection to Jesus Christ.

1. **one-by-one**: how Christ could suffer for each person (the Atonement).
2. **christ-at-the-center**: why Jesus Christ is the center of the gospel (Godhead and doctrine of Christ).
3. **recognizing-the-spirit**: not feeling the Spirit; recognizing Him (revelation).
4. **primary-questions**: knowing it's true amid hard questions (testimony; Elder Corbridge's framework).
5. **when-faithful-people-suffer**: why the faithful still suffer (plan of salvation, adversity).
6. **again-and-again**: forgiveness for repeated mistakes, plus "Am I good enough?" (repentance, grace).
7. **fear-god-friend**: fearing God vs. friendship with God (vocabulary and the character of God).
8. **families-beyond-the-veil**: loved ones of other faiths after death (spirit world, salvation for the dead).

Not chosen this release, and why:
- **Prayer:** it overlaps recognizing-the-spirit and the 1.x "meaningful prayer" question. It's the strongest candidate for the next release.
- **Missions and patriarchal blessings:** personal decisions rather than doctrine to investigate.
- **Creation and cosmos:** many details are unrevealed.
- **Women and priesthood:** needs careful official sourcing and owner review.
- **Commandments and practices:** better as short Explorer studies.
