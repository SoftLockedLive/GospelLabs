# Backups and local data

Gospel Labs stores investigations only in the browser's IndexedDB, on the device where they were written. There is no server copy. Backups are the way to keep a safe copy or move investigations to another browser or device.

## Export

**Settings › Your data › Export backup** downloads `gospel-labs-backup-YYYY-MM-DD.json` containing every investigation, with all of its evidence cards, claims, and notes.

## File format (version 1)

```json
{
  "format": "gospel-labs-backup",
  "version": 1,
  "exportedAt": "2026-10-20T12:00:00.000Z",
  "investigations": [
    {
      "id": "3f0c…",
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
      "conclusion": "…",
      "remainingQuestions": "…",
      "reflectionNotes": "…",
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
| An investigation that fails validation (wrong status, bad timestamp, a claim citing missing evidence, an unsafe link, …) | That entry is skipped; the preview lists each skipped entry and why |
| Two entries with the same id | The first is used; the duplicate is skipped and listed |
| Backup with no valid investigations | Nothing can be imported; Replace is not offered |
| Files over 50 MB | Rejected before reading |

## Versioning

`version` changes only when the format changes incompatibly. Older versions are upgraded by migration functions in [`src/persistence/backup.ts`](../src/persistence/backup.ts) (`MIGRATIONS`), one version at a time. The IndexedDB schema has its own version in [`src/persistence/db.ts`](../src/persistence/db.ts), migrated by Dexie.

## Protecting your data

- Export backups regularly. Clearing this site's data in the browser, or uninstalling the installed app on some platforms, deletes investigations permanently.
- **Settings › Your data** can ask the browser to keep Gospel Labs data even when the device is low on space ("persistent storage"). Browsers decide whether to grant this.
