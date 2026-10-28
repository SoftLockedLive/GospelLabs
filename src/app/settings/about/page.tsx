import type { Metadata } from "next";
import { AboutVersion, ArtCredits } from "@/components/release/about-version";
import { SettingsGroup, SettingsPage } from "@/components/settings/settings-page";

export const metadata: Metadata = { title: "About Gospel Labs" };

export default function AboutSettingsPage() {
  return (
    <SettingsPage title="About Gospel Labs">
      <AboutVersion />
      <SettingsGroup title="Art" description="The paintings in Gospel Labs are in the public domain.">
        <ArtCredits />
      </SettingsGroup>
    </SettingsPage>
  );
}
