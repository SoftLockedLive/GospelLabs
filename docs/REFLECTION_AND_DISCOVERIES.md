# Reflection and discoveries

Two optional ways to hold on to what an investigation means to the user. Neither is required, scored, or evaluated, and neither affects the investigation's status.

## Come unto Christ

In **Conclusion**, an optional reflection card asks:

1. What have you learned about Jesus Christ?
2. What would you like to understand better?
3. How might this influence the way you follow Him?

It also holds **Other reflections**: the investigation's existing reflection notes (`reflectionNotes`), which earlier versions showed as "Reflection". Only the label and position changed; the data didn't.

- Every answer saves as the user types, like every other field, and can be revised or cleared at any time.
- An investigation can be marked concluded with or without a reflection.
- Gospel Labs never generates, summarizes, or evaluates answers.

### Storage

Answers are stored in the investigation's `christReflection` object, keyed by prompt id:

```json
"christReflection": {
  "learned-about-christ": "…",
  "follow-him": "…"
}
```

The prompts and their ids are defined in [`src/domain/reflection.ts`](../src/domain/reflection.ts).

- A prompt's wording can be refined without touching saved answers.
- **Never change or reuse a prompt id.**
- Unanswered prompts have no key, and clearing an answer removes its key.
- Keys the app doesn't recognise (for example, from a newer version that added a prompt) are kept when the investigation is saved.

## Discovery highlights

**Save discovery** sits beside the section steps: the lightbulb on phones, or a button under the steps on wide screens. It's available in every section.

- **The dialog:** asks for a short title (required, up to 100 characters), the insight (optional), and, optionally, which existing evidence cards it relates to.
- **Where they appear:** saved discoveries are listed at the top of **Conclusion**, under "Your discoveries", to review while writing a conclusion. On wide screens, "N saved · Review" goes straight there.
- **Editing and deleting:** each discovery can be edited in the same dialog, or deleted with Undo.

Discoveries are separate from research challenge responses: a challenge response answers a prompt Gospel Labs offered, while a discovery is anything the user decides is worth keeping. Gospel Labs never creates, suggests, or judges discoveries.

### Linked evidence

- **Valid links only:** a discovery can link to evidence cards in the same investigation, each at most once. Links to cards that don't exist are dropped when the discovery is saved.
- **Deleting a linked card keeps the discovery.** The discovery is the user's own insight, so only its link to that card is removed, the same way a deleted card is removed from claims that cited it. Undo restores the card and its links together.
- **Editing a card** never affects its links, because links use the card's id.

### Storage

Discoveries are stored in the investigation's `discoveryHighlights` array:

```json
"discoveryHighlights": [
  {
    "id": "…",
    "title": "Discipleship is a daily choice",
    "insight": "…",
    "evidenceIds": ["…"],
    "createdAt": "…",
    "updatedAt": "…"
  }
]
```

Saves and imports validate them. An investigation is rejected if a discovery is malformed, links to a card that doesn't exist, links the same card twice, or reuses another discovery's id. On import, such an investigation is skipped and the preview lists the reason; nothing is silently repaired.

## Older data

Investigations and backups saved before these features existed load with no reflection answers and no discoveries. Everything else is unchanged, including earlier reflection notes, which appear as "Other reflections". See [BACKUPS.md](BACKUPS.md).
