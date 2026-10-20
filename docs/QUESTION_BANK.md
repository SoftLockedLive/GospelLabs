# Adding questions to the question bank

All curated questions live in one file: [`src/data/question-bank.json`](../src/data/question-bank.json). Adding a question means adding one object to its `questions` array. No code changes are needed: categories, filters, detail pages, and search pick it up automatically.

The file declares its JSON Schema (`"$schema": "./question-bank.schema.json"`), so editors such as VS Code autocomplete fields and flag mistakes as you type.

## Example entry

```json
{
  "id": "meaningful-prayer",
  "question": "What makes prayer meaningful rather than routine?",
  "category": "Worship",
  "difficulty": "introductory",
  "tags": ["prayer"],
  "suggestedReferences": [
    {
      "label": "James 1:5–6",
      "type": "scripture",
      "url": "https://www.churchofjesuschrist.org/study/scriptures/nt/james/1?lang=eng&id=p5-p6#p5"
    },
    {
      "label": "Gospel Topics: Prayer",
      "type": "gospel-topics",
      "url": "https://www.churchofjesuschrist.org/study/manual/gospel-topics/prayer?lang=eng"
    }
  ],
  "prompts": ["What counsel about how to pray appears in these passages?"],
  "submittedBy": "Optional name"
}
```

## Fields

| Field | Required | Rules |
| --- | --- | --- |
| `id` | Yes | Lowercase kebab-case (`meaning-of-the-sabbath`), at most 64 characters, unique. **Never change an id once published**, because investigations link to it. |
| `question` | Yes | Up to 300 characters. Phrase it openly; don't imply an answer. |
| `category` | Yes | Up to 60 characters. Reuse an existing category where one fits; a new one appears in the topic filter automatically. |
| `difficulty` | Yes | `introductory`, `intermediate`, or `advanced`. |
| `tags` | Yes | Array of short keywords (may be empty, at most 12). Used by search. |
| `suggestedReferences` | No | Up to 12. Each has a `label`, a `type` (`scripture`, `gospel-topics`, `general-conference`, `manual`, `other`), and an optional `url`. |
| `prompts` | No | Up to 8 open-ended study questions that don't presume a conclusion. |
| `submittedBy` | No | Attribution shown on the question's page. |

Unknown fields are rejected, so typos such as `promts` are caught.

## Reference links

- Links must be `https://www.churchofjesuschrist.org/...`. Other hosts are rejected.
- For verse ranges, use the Gospel Library's own format: `.../scriptures/<volume>/<book>/<chapter>?lang=eng&id=p<first>-p<last>#p<first>` (one verse: `id=p5#p5`).
- Scripture labels should read `Book Chapter:Verse` or `Book Chapter:First–Last` (en dash), for example `Alma 7:11–13`.
- A reference without a `url` is fine. Never guess a link.

After adding or changing links, run:

```bash
npm run verify:references
```

This needs network access. For every URL it checks that:

1. the Church's content service resolves that exact page, rather than falling back to a parent book or collection;
2. the highlighted verses exist on that page and the `#anchor` matches the first verse; and
3. for scripture labels, the label's book, chapter, and verses match the page and the `id=` range.

Verification confirms that a link opens the intended passage. It says nothing about whether the passage supports any conclusion, and the app never claims otherwise. Suggested references are starting points, not evidence.

## Validation

Every entry is validated with Zod ([`src/domain/question-bank.ts`](../src/domain/question-bank.ts)):

- `npm test` checks the shipped file and lists each invalid entry by position, id, and field.
- `npm run build` fails with the same report if the file is invalid, so a broken entry can't ship.

Example report:

```
src/data/question-bank.json has 2 problems:
  • questions[3] (personal-revelation) → difficulty: Invalid option: expected one of "introductory"|"intermediate"|"advanced"
  • questions[5] (born-again) → id: Duplicate id "born-again" (already used by questions[1])
```

## Changing the format

The JSON Schema is generated from the Zod schemas. After editing `src/domain/question-bank.ts`, regenerate it:

```bash
npm run questions:schema
```

`npm test` fails if the committed schema is out of date. If the file format changes incompatibly, bump `version` in both the file and `QUESTION_BANK_VERSION`.
