import type { Metadata } from "next";
import { DataManagement } from "@/components/settings/data-management";
import { SettingsPage } from "@/components/settings/settings-page";

export const metadata: Metadata = { title: "Backup and data" };

export default function DataSettingsPage() {
  return (
    <SettingsPage
      title="Backup and data"
      description="Everything you save is kept only on this device. Export a backup now and then, so you have a copy if the browser’s data is cleared."
    >
      <DataManagement />
    </SettingsPage>
  );
}
