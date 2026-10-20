"use client";

import { downloadTextFile } from "@/lib/download";
import { backupFileName, serializeBackup } from "@/persistence/backup";
import { getRepository } from "@/persistence/client";

/** Downloads a backup of everything stored. Returns what was exported. */
export async function exportAllData(): Promise<{ count: number; unreadable: number }> {
  const exportedAt = new Date().toISOString();
  const { backup, unreadable } = await getRepository().exportBackup(exportedAt);
  downloadTextFile(backupFileName(exportedAt), serializeBackup(backup));
  return { count: backup.investigations.length, unreadable };
}
