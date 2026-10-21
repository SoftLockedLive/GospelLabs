# Backups and local data

Gospel Labs stores investigations only in the browser's IndexedDB, on the device where they were written. There is no server copy. Backups are the way to keep a safe copy or move investigations to another browser or device.

## Export

**Settings › Your data › Export backup** downloads `gospel-labs-backup-YYYY-MM-DD.json` containing every investigation, with all of its evidence cards, claims, evidence connections, saved discoveries, challenge responses, discovery-trail notes, reflections, and other notes.

## File format (version 2)

```json
{
  "format": "gospel-labs-backup",
  "version": 2,
  "exportedAt": "2026-10-20T12:00:00.000Z",
  "investigations": [
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
      "context": "…",
      "subquestions": [{ "id": "…", "text": "…" }],
      "hypotheses": [{ "id": "…", "statement": "…" }],
      "evidence": [
        {
          "id": "…",
          "sourceType": "scripture",
          "sourceTitle": "Alma 32:21",
          "sourceUrl": "https://…",
          "observation": "…",
          "relevance": "…",
          "tags": ["faith"],
          "createdAt": "…",
          "updatedAt": "…"
        }
      ],
      "analysisNotes": "…",
      "claims": [
        {
          "id": "…",
          "section": "analysis",
          "statement": "…",
          "evidenceIds": ["…"],
          "createdAt": "…",
          "updatedAt": "…"
        }
      ],
      "evidenceConnections": [
        {
          "id": "…",
          "fromEvidenceId": "…",
          "toEvidenceId": "…",
          "relationship": "supports",
          "explanation": "…",
          "createdAt": "…",
          "updatedAt": "…"
        }
      ],
      "discoveryHighlights": [
        {
          "id": "…",
          "title": "…",
          "insight": "…",
          "evidenceIds": ["…"],
          "createdAt": "…",
          "updatedAt": "…"
        }
      ],
      "challengeResponses": [
        {
          "id": "…",
          "challengeId": "observe-repeated-words",
          "type": "observe",
          "title": "Repeated words",
          "prompt": "In a passage you're studying, which words or phrases appear more than once? …",
          "response": "…",
          "createdAt": "…",
          "updatedAt": "…"
        }
      ],
      "trailProgress": [
        {
          "trailId": "forgiveness-before-the-atonement",
          "currentStepId": "john-8-no-condemnation",
          "steps": [
            {
              "stepId": "mark-2-sins-forgiven",
              "title": "Sins forgiven in Capernaum",
              "question": "What does Jesus say to the man brought to Him, …?",
              "discoveries": "…",
              "explored": true,
              "updatedAt": "…"
            }
          ]
        }
      ],
      "conclusion": "…",
      "remainingQuestions": "…",
      "reflectionNotes": "…",
      "christReflection": { "learned-about-christ": "…" },
      "status": "investigating"
    }
  ]
}
```

The authoritative definition is the Zod schema in [`src/domain/investigation.ts`](../src/domain/investigation.ts).

## Import

**Settings › Your data › Import backup** reads a backup file, validates it, and shows a preview before changing anything.

| Mode | What happens |
| --- | --- |
| **Merge** (default) | Adds investigations from the backup. When an investigation exists both on the device and in the backup, the copy edited most recently is kept (ties keep the device's copy). Nothing is deleted. Re-importing the same backup changes nothing. |
| **Replace** | Deletes every investigation on the device, then writes the backup's investigations. The dialog says how many investigations will be deleted, offers to download a backup of the current data first, and requires an explicit acknowledgement. |

Both modes run in a single IndexedDB transaction: if anything fails partway (for example, the disk is full), the database is left exactly as it was.

## Validation and errors

| Problem | Result |
| --- | --- |
| Empty, truncated, or non-JSON file | Rejected: "The file isn't valid JSON…" |
| JSON that isn't a Gospel Labs backup | Rejected |
| Backup from a newer version of the app | Rejected with a request to update the app |
| Missing or invalid version | Rejected |
| An investigation that fails validation (wrong status, bad timestamp, a claim, connection, or discovery referring to missing evidence, a card connected to itself, a pair connected twice, an unsafe link, …) | That entry is skipped; the preview lists each skipped entry and why |
| Two entries with the same id | The first is used; the duplicate is skipped and listed |
| Backup with no valid investigations | Nothing can be imported; Replace is not offered |
| Files over 50 MB | Rejected before reading |

## Versioning

| Version | App | Change |
| --- | --- | --- |
| 1 | Gospel Labs 1.0 | Original format. |
| 2 | Gospel Labs 1.1 | Investigations gain `evidenceConnections` (see [EVIDENCE_CONNECTIONS.md](EVIDENCE_CONNECTIONS.md)), `discoveryHighlights` and `christReflection` (see [REFLECTION_AND_DISCOVERIES.md](REFLECTION_AND_DISCOVERIES.md)), `challengeResponses` (research challenge responses), and `trailProgress` (discovery-trail notes). |

`version` changes whenever an older app couldn't safely import the file. Gospel Labs 1.0 would silently drop the new fields, so 1.1 writes version 2, and 1.0 refuses those files with a request to update instead of losing data. Version 2 gained `trailProgress`, `evidenceConnections`, `discoveryHighlights`, and `christReflection` before 1.1 was released; version 2 files written without some of them (by pre-release builds) import with those fields empty and everything else intact.

Older files are upgraded by migration functions in [`src/persistence/backup.ts`](../src/persistence/backup.ts) (`MIGRATIONS`), one version at a time, before validation. Version 1 backups import into 1.1 with every field intact and none of the 1.1 additions.

Each investigation also carries `dataVersion`: the record format of the app version that last saved it (2 for 1.1; absent on records saved before 1.1). It protects newer data from older code:

- **Import:** an investigation stamped with a newer format than this app writes is skipped and listed as saved by a newer version.
- **Merge:** never replaces a stored investigation stamped with a newer format.
- **Saving:** the app won't save over one either; it opens it with a request to reload instead.

Exports write investigations exactly as stored, so fields a newer version added and this one doesn't know are kept in the file.

Records already stored in IndexedDB need no migration: fields added later are filled in with their defaults when an older record is read, and a record is only rewritten when the user edits it. From 1.1 on, fields added by a newer version are kept, not dropped, when an older version saves the record. The IndexedDB schema itself (tables and indexes) has its own version in [`src/persistence/db.ts`](../src/persistence/db.ts), migrated by Dexie.

## Protecting your data

- Export backups regularly. Clearing this site's data in the browser, or uninstalling the installed app on some platforms, deletes investigations permanently.
- **Settings › Your data** can ask the browser to keep Gospel Labs data even when the device is low on space ("persistent storage"). Browsers decide whether to grant this.
