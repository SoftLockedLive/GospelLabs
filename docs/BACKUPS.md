# Backups and local data

Gospel Labs stores everything only in the browser's IndexedDB, on the device where it was written. There is no server copy. Backups are the way to keep a safe copy or move your data to another browser or device.

## What a backup contains

| In the file | What it is | Stored in |
| --- | --- | --- |
| `investigations` | Research investigations (the 1.x notebook): evidence cards, claims, evidence connections, saved discoveries, challenge responses, discovery-trail notes, reflections, and other notes | IndexedDB `investigations` |
| `study.progress` | Progress in each guided investigation: difficulty, length, position, every step's state (attempts, hints, answers, reflections), side questions visited, and the Discovery Card it created | IndexedDB `studyProgress` |
| `study.discoveries` | Discovery Cards: what was discovered, its sources, concepts, connections (demonstrated or suggested), highlights, and your notes | IndexedDB `discoveries` |
| `study.personalConnections` | Connections you added to your Discovery Map, with your note | IndexedDB `personalConnections` |
| `study.explorations` | What you explored in Scripture Explorer, Character of Christ, and Connect with Christ (never a score) | IndexedDB `explorations` |
| `study.journal` | Journal entries in the Notebook: what you wrote, its kind (a thought, a tender mercy, a question), and where it came up, if you linked it | IndexedDB `journal` |
| `preferences` | Theme, motion, study length, default difficulty, and activity options | localStorage (`gospel-labs:theme`, `gospel-labs:preferences`) |

Curated content (questions, investigations, passages, attributes) is part of the app, not your data, and is never in a backup.

## Export

**Settings › Your data › Export backup** downloads `gospel-labs-backup-YYYY-MM-DD.json` with all of the above.

- Every record is written **exactly as stored**, so fields added by a newer version of Gospel Labs and unknown to this one are kept in the file.
- Records saved by a newer version are exported as stored even if this version can't read them, so exporting from an older tab never loses them.
- Damaged records (ones this version can't read, not from a newer version) are left out; the confirmation says how many.
- Preferences: only those actually stored on this device are included (a setting you never changed is left out, so restoring it elsewhere leaves that device's choice alone). The Map's "last visited" time is device state, not a preference, and is never exported.
- The export is read in one transaction, so it's a consistent snapshot, and it runs after any edits a closing page left in a safety copy have been recovered.

## File format (version 4)

```json
{
  "format": "gospel-labs-backup",
  "version": 4,
  "exportedAt": "2026-10-26T12:00:00.000Z",
  "investigations": [ { "id": "3f0c…", "dataVersion": 2, "title": "…", "…": "see below" } ],
  "study": {
    "progress": [
      {
        "id": "he-knows-how-to-help",
        "dataVersion": 1,
        "contentVersion": 1,
        "startedAt": "…",
        "updatedAt": "…",
        "completedAt": "…",
        "difficulty": "medium",
        "length": "quick",
        "position": { "stepId": "connect" },
        "steps": {
          "notice": { "status": "complete", "difficulty": "medium", "attempts": 2, "hintsShown": 1, "revealed": false, "skipped": false, "response": { "…": "…" }, "updatedAt": "…" },
          "friends/why-friends": { "status": "started", "difficulty": "easy", "reflection": "…", "updatedAt": "…" }
        },
        "visitedBranches": ["friends"],
        "discoveryId": "6f1b…"
      }
    ],
    "discoveries": [
      {
        "id": "6f1b…",
        "dataVersion": 1,
        "createdAt": "…",
        "updatedAt": "…",
        "origin": { "kind": "investigation", "contentId": "he-knows-how-to-help", "contentVersion": 1, "difficulty": "medium", "primaryQuestion": "christ" },
        "title": "He knows how to help",
        "question": "…",
        "summary": "…",
        "sources": [{ "id": "alma-7-11-12", "label": "Alma 7:11–12", "kind": "scripture", "url": "https://…" }],
        "concepts": [{ "ref": "concept:atonement", "label": "Atonement", "demonstrated": true }],
        "connections": [{ "id": "…", "from": { "ref": "scripture:alma-7-11-12", "label": "…" }, "to": { "ref": "concept:atonement", "label": "…" }, "relation": "teaches", "sourceIds": ["alma-7-11-12"], "note": "…", "provenance": "demonstrated" }],
        "highlights": [{ "sourceId": "alma-7-11-12", "verse": 12, "text": "…", "note": "" }],
        "notes": "…"
      }
    ],
    "personalConnections": [
      { "id": "8a9b…", "dataVersion": 1, "createdAt": "…", "updatedAt": "…", "from": { "ref": "concept:atonement", "label": "Atonement" }, "to": { "ref": "concept:succor", "label": "Succor" }, "relation": "relates-to", "note": "…", "sourceIds": [] }
    ],
    "explorations": [
      { "id": "passage:alma-7-11-13", "dataVersion": 1, "kind": "passage", "contentId": "alma-7-11-13", "firstAt": "…", "updatedAt": "…", "completedActivities": ["…"], "vocabulary": [], "highlights": [{ "id": "…", "verse": 12, "start": 0, "end": 6, "note": "", "createdAt": "…" }], "note": "" }
    ],
    "journal": [
      { "id": "3c4d…", "dataVersion": 1, "createdAt": "…", "updatedAt": "…", "kind": "thought", "text": "…", "link": { "kind": "investigation", "contentId": "he-knows-how-to-help", "label": "He knows how to help · Step 2", "stepId": "notice" } },
      { "id": "7a8b…", "dataVersion": 1, "createdAt": "…", "updatedAt": "…", "kind": "tender-mercy", "text": "…" }
    ]
  },
  "preferences": {
    "theme": "dawn",
    "motion": "subtle",
    "studyLength": "quick",
    "difficulty": "medium",
    "activity": { "offerBranches": true, "showReflections": true, "suggestDifficulty": true }
  }
}
```

A journal entry's `kind` is `thought` (the default), `tender-mercy`, or `question`, and its `text` is 1 to 20,000 characters. `link` is optional: the `kind` of place (`investigation`, `passage`, `attribute`, `connect`, or `card` for a Discovery Card, whose id is then the `contentId`), and `label`, how the place read when the entry was written, so the link still reads well if content changes later. A link to a step adds `stepId` (and `branchId` in a side question).

Each investigation has the same shape as in version 2:

```json
{
  "id": "3f0c…",
  "dataVersion": 2,
  "question": "…",
  "sourceQuestionId": "faith-and-works",
  "title": "…",
  "category": "…",
  "createdAt": "…",
  "updatedAt": "…",
  "currentSection": "analysis",
  "researchActivity": "evidence",
  "context": "…",
  "subquestions": [{ "id": "…", "text": "…" }],
  "hypotheses": [{ "id": "…", "statement": "…" }],
  "evidence": [
    { "id": "…", "sourceType": "scripture", "sourceTitle": "Alma 32:21", "sourceUrl": "https://…", "observation": "…", "relevance": "…", "tags": ["faith"], "createdAt": "…", "updatedAt": "…" }
  ],
  "analysisNotes": "…",
  "claims": [{ "id": "…", "section": "analysis", "statement": "…", "evidenceIds": ["…"], "createdAt": "…", "updatedAt": "…" }],
  "evidenceConnections": [{ "id": "…", "fromEvidenceId": "…", "toEvidenceId": "…", "relationship": "supports", "explanation": "…", "createdAt": "…", "updatedAt": "…" }],
  "discoveryHighlights": [{ "id": "…", "title": "…", "insight": "…", "evidenceIds": ["…"], "createdAt": "…", "updatedAt": "…" }],
  "challengeResponses": [{ "id": "…", "challengeId": "observe-repeated-words", "type": "observe", "title": "Repeated words", "prompt": "…", "response": "…", "createdAt": "…", "updatedAt": "…" }],
  "trailProgress": [{ "trailId": "forgiveness-before-the-atonement", "currentStepId": "…", "steps": [{ "stepId": "…", "title": "…", "question": "…", "discoveries": "…", "explored": true, "updatedAt": "…" }] }],
  "conclusion": "…",
  "remainingQuestions": "…",
  "reflectionNotes": "…",
  "christReflection": { "learned-about-christ": "…" },
  "status": "investigating"
}
```

The authoritative definitions are the Zod schemas in [`src/domain/investigation.ts`](../src/domain/investigation.ts) (investigations), [`src/domain/study/user-data.ts`](../src/domain/study/user-data.ts) (study records), and [`src/domain/study/journal.ts`](../src/domain/study/journal.ts) (journal entries). The file format, migrations, and import rules are in [`src/persistence/backup.ts`](../src/persistence/backup.ts); the database side is in [`src/persistence/full-backup.ts`](../src/persistence/full-backup.ts).

## Import

**Settings › Your data › Import backup** reads a backup file, validates it, and shows a preview before changing anything: for each mode, what would happen to each kind of data (research investigations, guided-investigation progress, Discovery Cards, Map connections, explorations, journal entries), computed against the data stored right now.

| Mode | Investigations and study data | Preferences |
| --- | --- | --- |
| **Merge** (default) | Adds records from the backup. When a record exists both on the device and in the backup, the copy updated most recently is kept (ties keep the device's copy). A record on the device saved by a newer version of Gospel Labs is never replaced. Nothing is deleted. Re-importing the same backup changes nothing. | Kept as they are unless you tick **Also restore appearance and study preferences** (off by default). |
| **Replace** | Deletes every research investigation **and all study data** on the device, then writes the backup's records. | Restored by default (the same checkbox, on by default; you can untick it). |

The same rules apply to every kind of record: one progress record per guided investigation, Discovery Cards, Map connections, explorations, and journal entries are each matched by id. (Unlike research notebooks, study records are small, complete states, so the most recently updated copy is the one to keep.)

A record on the device that this version can't read (damaged) and that wasn't saved by a newer version is replaced by the backup's valid copy during a merge, and the preview counts it as updated.

### Protection against accidental overwrites

- Nothing changes until you confirm, and the preview is computed again inside the import, so the import does exactly what the data allowed at that moment.
- **Replace** names everything it will delete ("Everything now on this device will be permanently deleted: 2 research investigations, 3 Discovery Cards, …"), offers **Download a backup of my current data**, and requires ticking "I understand…" before **Replace all data** is enabled. Replacing with a 1.x backup (which has no study data) deletes your study data; the dialog says the file was made by Gospel Labs 1.x and lists the study records it will delete. Likewise, replacing with a version 3 backup (from 2.0–2.2, which had no Journal) deletes your journal entries, and the dialog lists them among what it will delete.
- **Merge** never deletes, but when it would replace items on the device with more recently updated copies, it says how many and offers the same download.

### Atomic imports and recovery

Both modes run in a **single IndexedDB transaction across all six tables**. Every record is validated before anything is written; if anything fails partway (an invalid record, a full disk, storage becoming unavailable), the transaction rolls back and the database is left exactly as it was. The dialog then says what went wrong and "Nothing was changed."

Preferences are applied only **after** the database import has succeeded. If applying them fails, the data import still stands and the confirmation says the preferences couldn't be restored.

## Validation and errors

| Problem | Result |
| --- | --- |
| Empty, truncated, or non-JSON file | Rejected: "The file isn't valid JSON…" |
| JSON that isn't a Gospel Labs backup | Rejected |
| Backup from a newer version of the app (format 5 or later) | Rejected with a request to update the app |
| Missing or invalid version | Rejected |
| No list of investigations | Rejected as damaged |
| Files over 50 MB | Rejected before reading |
| An investigation that fails validation (wrong status, bad timestamp, a claim, connection, or discovery referring to missing evidence, a card connected to itself, a pair connected twice, an unsafe link, …) | That entry is skipped |
| A study record that fails its schema (for example a card without a title, a Map connection joining a node to itself, a highlight covering no words, a journal entry with no text or an unknown kind) | That entry is skipped |
| A record (investigation or study) stamped by a newer version | Skipped as "Saved by a newer version of Gospel Labs", even if this version can't validate it |
| Two entries of the same kind with the same id | The first is used; the duplicate is skipped |
| A version 3 file (from 2.0–2.2) | Imported with no journal entries (anything under `study.journal` in such a file isn't Gospel Labs data and is ignored) |
| A version 3 or 4 file without a `study` section | Treated as having no study data; the preview says so |
| A `study` section, or one of its lists, that isn't the right shape | That section or list is ignored; the preview says so; the other lists import normally |
| Invalid preferences (an unknown theme, a misspelled motion setting, …) | Those preferences are ignored, the valid ones are kept, and the preview names the ignored ones |
| A `preferences` section that isn't an object | Ignored, with a note |
| Unknown preference fields (from a newer version) | Ignored |
| A backup with no valid records at all | Nothing can be imported; Import and Replace are not offered |

Skipped entries are listed in the preview by kind, position, id, and title or label where the record has one (a journal entry by its first words), with the reason. Nothing is silently repaired.

**References between records.** A progress record's `discoveryId` names the Discovery Card its completed investigation created. If a backup has a progress record whose card isn't in the file (the card was damaged and skipped, or the file was edited), the progress is **imported unchanged** and the preview notes it: the link works only if that card is already on the device. Deleting a card in the app removes the link from progress, so exports from the app don't contain such references.

## Versioning

| Version | App | Change |
| --- | --- | --- |
| 1 | Gospel Labs 1.0 | Original format. |
| 2 | Gospel Labs 1.1 | Investigations gain `evidenceConnections` (see [EVIDENCE_CONNECTIONS.md](EVIDENCE_CONNECTIONS.md)), `discoveryHighlights` and `christReflection` (see [REFLECTION_AND_DISCOVERIES.md](REFLECTION_AND_DISCOVERIES.md)), `challengeResponses` (research challenge responses), and `trailProgress` (discovery-trail notes). |
| 3 | Gospel Labs 2.0 | Adds `study` (progress, Discovery Cards, personal Map connections, explorations) and `preferences`. Investigations are unchanged. |
| 4 | Gospel Labs 3.0 | Adds `study.journal` (journal entries). Everything else is unchanged. |

`version` changes whenever an older app couldn't safely import the file. Gospel Labs 1.1 would import a version 3 file's investigations and silently leave out its study data (in Replace mode, deleting the study data on the device while looking like a complete restore), so 2.0 writes version 3, and 1.1 refuses those files with a request to update instead. Likewise 1.0 refuses version 2 and 3 files. (Verified against the 1.0 and 1.1 code: both answer a version 3 file with "This backup was made by a newer version of Gospel Labs (format 3).")

For the same reason 3.0 writes version 4: Gospel Labs 2.0–2.2 read only the four study lists they know, so given a version 3 file with a journal in it, they would import everything else and silently leave the journal out, which in Replace mode would look like a complete restore. Instead they refuse version 4 files with a request to update. (Verified against the 2.0.0, 2.1.0, 2.2.0, and 2.2.0.1 code: each accepts up to version 3 and answers a version 4 file with "This backup was made by a newer version of Gospel Labs (format 4).") Preferences are unchanged in version 4.

### Compatibility

| File | Gospel Labs 1.0 | Gospel Labs 1.1 | Gospel Labs 2.0–2.2 | Gospel Labs 3.0 |
| --- | --- | --- | --- | --- |
| Version 1 (from 1.0) | Imports | Imports, every field intact | Imports, every field intact; no study data | Imports, every field intact; no study data |
| Version 2 (from 1.1, including pre-release builds) | Refuses: "newer version" | Imports | Imports, every field intact; no study data | Imports, every field intact; no study data |
| Version 3 (from 2.0–2.2) | Refuses: "newer version" | Refuses: "newer version" | Imports | Imports; no journal entries |
| Version 4 (from 3.0) | Refuses: "newer version" | Refuses: "newer version" | Refuses: "newer version" | Imports |

Older files are upgraded by migration functions in [`src/persistence/backup.ts`](../src/persistence/backup.ts) (`MIGRATIONS`), one version at a time, before validation: 1 → 2 adds the 1.1 investigation fields, empty; 2 → 3 adds an empty `study` and no preferences (anything under those keys in an older file isn't Gospel Labs data and is ignored); 3 → 4 adds an empty `study.journal` (likewise, anything under that key in a version 3 file is ignored), and leaves a missing or damaged `study` section for the import to report as before. Version 2 gained `trailProgress`, `evidenceConnections`, `discoveryHighlights`, and `christReflection` before 1.1 was released; version 2 files written without some of them (by pre-release builds) import with those fields empty and everything else intact.

### Record formats (`dataVersion`)

Each record also carries `dataVersion`: the record format of the app version that last saved it. Investigations use `RECORD_DATA_VERSION` (2 since 1.1; absent on records saved before 1.1) and study records, journal entries included, use `STUDY_DATA_VERSION` (1 since 2.0). It protects newer data from older code:

- **Import:** a record stamped with a newer format than this app writes is skipped and listed as saved by a newer version.
- **Merge:** never replaces a stored record stamped with a newer format, even one this version can't read.
- **Saving:** the app won't save over one either.
- **Export:** records stamped with a newer format are exported as stored.

Imported records are stamped with this version's format, as saving them would.

Records already stored in IndexedDB need no migration: fields added later are filled in with their defaults when an older record is read, and a record is only rewritten when the user edits it. Fields added by a newer version at the top level of a record are kept, not dropped, when an older version saves it. The IndexedDB schema itself (tables and indexes) has its own version in [`src/persistence/db.ts`](../src/persistence/db.ts), migrated by Dexie; version 2 (Gospel Labs 2.0) only added the study tables, and version 3 (Gospel Labs 3.0) only added the `journal` table. A 2.0–2.2 tab (or a rollback to 2.2) can still open a version 3 database and use everything else in it, but it doesn't know the journal: a backup exported from such a tab leaves the journal entries out (they stay on the device).

## Delete all data

**Settings › Your data › Delete all data** deletes every research investigation and all study data (progress, Discovery Cards, Map connections, explorations, journal entries) in one transaction. The confirmation lists how many of each kind will be deleted, offers a backup first, and requires an explicit acknowledgement. Appearance and study preferences are kept.

The summary at the top of **Your data** shows how many records of each kind are saved on this device, including any damaged ones (deleting everything removes those too).

## Protecting your data

- Export backups regularly. Clearing this site's data in the browser, or uninstalling the installed app on some platforms, deletes everything permanently.
- **Settings › Your data** can ask the browser to keep Gospel Labs data even when the device is low on space ("persistent storage"). Browsers decide whether to grant this.
- Before replacing your data, download a backup of what's there (the dialog offers it).
