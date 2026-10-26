"use client";

import { downloadTextFile } from "@/lib/download";
import { backupFileName, serializeBackup, type DataCounts } from "@/persistence/backup";
import { readStoredPreferences } from "@/persistence/backup-preferences";
import { getRepository } from "@/persistence/client";

/**
 * Downloads a backup of everything stored: investigations, study data, and
 * this device's appearance and study preferences. Returns what was exported
 * and how many damaged records couldn't be included.
 */
export async function exportAllData(): Promise<{ counts: DataCounts; unreadable: number }> {
  const exportedAt = new Date().toISOString();
  const { backup, counts, unreadable } = await getRepository().exportBackup(exportedAt, {
    preferences: readStoredPreferences(),
  });
  downloadTextFile(backupFileName(exportedAt), serializeBackup(backup));
  return { counts, unreadable };
}
