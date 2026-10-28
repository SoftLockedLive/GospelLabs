import type { Metadata } from "next";
import { MotionSelector } from "@/components/settings/motion-selector";
import { SettingsGroup, SettingsPage } from "@/components/settings/settings-page";
import { ThemeSelector } from "@/components/settings/theme-selector";

export const metadata: Metadata = { title: "Appearance" };

export default function AppearanceSettingsPage() {
  return (
    <SettingsPage title="Appearance" description="Saved in this browser, and included in your backups.">
      <SettingsGroup title="Theme" description="Every theme has the same layout. Parchment is made for long reading; System follows your device.">
        <ThemeSelector />
      </SettingsGroup>
      <SettingsGroup title="Motion" description="How much the screen moves when something appears or an answer is confirmed. Never needed to understand anything.">
        <MotionSelector />
      </SettingsGroup>
    </SettingsPage>
  );
}
