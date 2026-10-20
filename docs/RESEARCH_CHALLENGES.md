# Research challenges

Research challenges are short, optional prompts in the Research section that suggest a way to look closer: observe a detail, connect two passages, compare sources, record a new question, or name a principle to live. They work with every investigation, whether it started from the question bank or from the user's own question.

Challenges are never graded, scored, or required. A response is the user's own writing and is saved with the investigation like every other note.

## Adding or editing challenges

All challenges live in one file: [`src/data/research-challenges.json`](../src/data/research-challenges.json). Adding one means adding an object to its `challenges` array; no code changes are needed.

```json
{
  "id": "observe-repeated-words",
  "type": "observe",
  "title": "Repeated words",
  "prompt": "In a passage you're studying, which words or phrases appear more than once? What might the repetition emphasize?",
  "tip": "Read a few verses before and after to see how far the theme runs."
}
```

| Field | Required | Rules |
| --- | --- | --- |
| `id` | Yes | Lowercase kebab-case, at most 64 characters, unique. Start it with the type (`observe-…`) by convention. **Never change or reuse an id once published**, because saved responses refer to it. |
| `type` | Yes | `observe`, `connect`, `compare`, `question`, or `apply`. |
| `title` | Yes | Up to 60 characters. |
| `prompt` | Yes | Up to 300 characters. What to do. |
| `tip` | No | Up to 300 characters. A practical hint on how to go about it. |

The file is validated when the app builds: an invalid entry, an unknown field, or a duplicate id fails the build with a message naming the entry and field. `npm test` also checks that every type keeps at least three challenges.

### Writing guidelines

- **Work for any question.** A challenge appears in every investigation, so refer to "your question" or "a passage you're studying", not a specific topic.
- **Ask; don't answer.** Prompts are open-ended. Don't state doctrinal conclusions or imply what the user should find.
- **No quotations.** Don't quote scripture or leaders in a challenge. Point the user to sources (footnotes, the Topical Guide, general conference) and let them read for themselves.
- **No pressure.** Don't ask users to report spiritual experiences, feelings, or commitments.
- **Keep it Christ-centered without presuming.** "How might this relate to Jesus Christ?" invites study; "This shows that…" does not.

## Changing or removing a challenge

Each response stores a copy of the challenge's type, title, and prompt as they were when the user first responded. Editing a challenge's wording or removing it from the file never changes or deletes existing responses: they keep the wording they were written for and stay in the user's list of responses.

## How responses are stored

Responses are kept in the investigation's `challengeResponses` array (see [BACKUPS.md](BACKUPS.md) for the full record format). There is at most one response per challenge in an investigation. Clearing a response's text removes it; deleting it from the list can be undone.
