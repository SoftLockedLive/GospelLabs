# Discovery trails

A discovery trail is an optional, guided path through particular passages for one curated question. Each step gives a guiding question and passages to read, separates what the passages **state** from what is **open to interpretation**, and gives the user a place to record their discoveries. Steps can be explored in any order; nothing is locked or required, and no step supplies a conclusion.

Trails appear in the **Research** section of investigations started from their question. The Question section links to the trail, the question bank shows which questions have one, and My Library shows how many steps have been marked explored. Questions without a trail, and the user's own questions, work as before.

Trails differ from [research challenges](RESEARCH_CHALLENGES.md): challenges are general study prompts that work for any question; a trail is written for one question and walks through specific passages.

## Adding or editing a trail

All trails live in [`src/data/discovery-trails.json`](../src/data/discovery-trails.json). The question must already exist in [the question bank](QUESTION_BANK.md), and each question can have one trail.

```json
{
  "id": "forgiveness-before-the-atonement",
  "questionId": "forgiveness-before-the-atonement",
  "title": "Forgiveness before the Atonement",
  "introduction": "Read three passages closely. …",
  "steps": [
    {
      "id": "mark-2-sins-forgiven",
      "title": "Sins forgiven in Capernaum",
      "question": "What does Jesus say to the man brought to Him, and how do the people around Him respond?",
      "references": [
        {
          "label": "Mark 2:5–12",
          "type": "scripture",
          "url": "https://www.churchofjesuschrist.org/study/scriptures/nt/mark/2?lang=eng&id=p5-p12#p5"
        }
      ],
      "stated": ["When Jesus saw their faith, He said to the man sick of the palsy, “Son, thy sins be forgiven thee” (verse 5)."],
      "interpretation": ["Does this passage explain how Jesus was able to forgive sins, or does it state only that He had the power to do so?"],
      "reflection": ["What, if anything, does this account change about how you think of coming to the Savior?"],
      "connections": [{ "stepId": "john-8-no-condemnation", "note": "Compare … with what Jesus says to the woman in John 8:11." }],
      "recordIn": "analysis"
    }
  ]
}
```

### Trail fields

| Field | Required | Rules |
| --- | --- | --- |
| `id` | Yes | Lowercase kebab-case, unique. **Never change it once published**: saved notes refer to it. |
| `questionId` | Yes | The `id` of a question in the question bank. One trail per question. |
| `title` | Yes | Up to 120 characters. |
| `introduction` | No | Up to 600 characters. |
| `steps` | Yes | 2 to 12 steps, shown in this order but never locked. |

### Step fields

| Field | Required | Rules |
| --- | --- | --- |
| `id` | Yes | Lowercase kebab-case, unique within the trail. **Never change or reuse a step id**: saved notes refer to it. |
| `title` | Yes | Up to 80 characters. |
| `question` | Yes | The guiding question, up to 300 characters. Must end with "?". |
| `references` | No | Up to 6, in the same format as question-bank references (links must be `https://www.churchofjesuschrist.org`). Each gets a "Record as evidence" button. |
| `stated` | No | Up to 8. **What the passages state directly**, with verse numbers. Shown under "Stated in the text". |
| `interpretation` | No | Up to 8. **Questions the text leaves open.** Must end with "?". Shown under "Open to interpretation". |
| `reflection` | No | Up to 4 optional, personal prompts. Must end with "?". |
| `connections` | No | Up to 4 links to other steps in the same trail: `stepId` and a `note` saying what to compare. |
| `recordIn` | No | A workspace section (`question`, `hypothesis`, `research`, `analysis`, `conclusion`) offered as "Continue in …". |

## Writing guidelines

The point of a trail is to show the user where the text ends and interpretation begins. Keep the two strictly apart:

- **`stated` describes only what the passage says.** Cite the verse. If a passage does *not* say something readers often assume, say that plainly too. For example, the John 8 step says the account records "Neither do I condemn thee" and does not record Jesus telling the woman that her sins were forgiven.
- **`interpretation` asks; it never answers.** Every entry is a question. If you find yourself writing "This shows that…", it belongs nowhere in the trail.
- **No conclusions anywhere.** No step, introduction, or connection should resolve the trail's question. The user's conclusion is written by the user, in the Conclusion section.
- **Quote exactly, or don't quote.** Text inside curly double quotes (“…”) is treated as a quotation from the trail's references and is checked word for word (see below). To mention a word rather than quote a passage, use single curly quotes: ‘forgive’. Don't use straight double quotes.
- **Keep quotations short.** A phrase or a verse is enough. Point to the source for the rest.
- **No pressure.** Reflection prompts are optional and personal; don't ask users to report spiritual experiences.

## Checks

When the app builds, the trails file is validated: unknown fields, missing fields, duplicate ids, connections to missing steps, and a `questionId` that isn't in the question bank all fail the build with a message naming the trail, step, and field.

`npm test` also checks that guiding questions, interpretation questions, and reflection prompts end with "?", that quotations only appear in trails that cite references, and that no straight double quotes are used.

`npm run verify:references` (needs a network connection) checks every trail link the same way it checks question-bank links. It also confirms that **every quotation appears word for word in the verses the trail cites, or in those verses' footnotes**, ignoring only capitalization and trailing punctuation. Run it after any change to a trail.

## Saved progress

A user's notes are stored on their investigation, in its `trailProgress` field (see [BACKUPS.md](BACKUPS.md)): the step they last viewed, and for each step they wrote in or marked explored, their discoveries and the explored mark. Each entry also keeps a copy of the step's title and guiding question as they were when the user first wrote there.

So revising a trail never loses notes:

- Changing a step's wording leaves existing notes attached to the step, with the wording they were written for.
- Removing a step keeps its notes in the investigation; Research lists them under "Notes from earlier versions of this trail".
- Removing a whole trail keeps its notes too; Research lists them under "Notes from a discovery trail".
