# Evidence connections

In Research, below the evidence list, users can connect two pieces of evidence from the same investigation and say how they relate. Each connection has a relationship and an optional explanation in the user's own words.

Connections are made only by the user. Gospel Labs never creates, suggests, or evaluates them, and a connection is not a claim that one source proves another.

## Relationships and direction

| Relationship | Reads as | Direction |
| --- | --- | --- |
| Supports | "E1 supports E3" | From the first card to the second |
| Challenges | "E1 challenges E3" | From the first card to the second |
| Raises a question | "E1 raises a question about E3" | From the first card to the second |
| Connects to | "E1 connects to E3" | None: the cards are related without either acting on the other |

A connection stores its two cards as `fromEvidenceId` and `toEvidenceId`, and the directional relationships always read from `from` to `to`. Editing a connection can swap its direction. For "Connects to", the stored order only decides which card is shown first.

## Rules

- **Same investigation only.** Both cards must exist in the investigation that holds the connection.
- **No self-connections.** A card can't be connected to itself.
- **One connection per pair of cards**, in either direction. If E1 and E3 are connected, the form disables E3 as a partner for E1 (and E1 for E3), and the user edits the existing connection instead. To record two aspects of the same relationship, use the explanation.
- **Deleting a card deletes its connections**, just as it removes the card from any claims that cited it. The Undo bar says how many connections went with it ("Evidence and 2 connections removed"), and Undo restores the card, its connections, and its claim links together.
- **Editing a card keeps its connections.** Connections refer to cards by id, so editing a card's text never breaks them. The labels E1, E2, … follow list order and can shift when a card is deleted; connections are unaffected.

## Creating, editing, and deleting

- **Create connection** (or the connect button on an evidence card, which preselects that card) opens a form: first card, relationship, second card, and an optional explanation. Nothing is preselected except the card the user started from, and a preview shows the sentence the connection will read as.
- **Edit** changes the relationship, swaps the direction, or rewrites the explanation in place. Each change is saved as it's made, like every other edit. To connect different cards, delete the connection and create a new one.
- **Delete** removes the connection immediately, with Undo.
- Selecting a card inside a connection moves to that card in the evidence list.

## Storage and validation

Connections are stored in the investigation's `evidenceConnections` array; see [BACKUPS.md](BACKUPS.md) for the record format.

Every save and every import validates them. An investigation is rejected if a connection:

- uses an unknown relationship or is otherwise malformed;
- refers to a card that doesn't exist in that investigation;
- connects a card to itself;
- repeats a pair of cards that is already connected; or
- reuses another connection's id.

On import, such an investigation is skipped and the preview lists it with the reason, the same way an investigation whose claims cite missing evidence is skipped. Nothing is silently dropped or repaired, and the rest of the backup still imports.

Investigations saved before connections existed load with none, with all their other data unchanged.
