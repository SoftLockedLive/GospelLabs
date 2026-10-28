import type { Metadata } from "next";
import { SettingsPage } from "@/components/settings/settings-page";
import { StudyPreferences } from "@/components/settings/study-preferences";

export const metadata: Metadata = { title: "Study settings" };

export default function StudySettingsPage() {
  return (
    <SettingsPage title="Study" description="Starting points for new investigations. You can change any of these while you study.">
      <StudyPreferences />
    </SettingsPage>
  );
}
