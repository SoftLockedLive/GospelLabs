import { Database, MessageSquare, Palette, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/app-shell";
import { DataManagement } from "@/components/settings/data-management";
import { FeedbackLinks } from "@/components/settings/feedback-links";
import { SettingsSection } from "@/components/settings/settings-section";
import { ThemeSelector } from "@/components/settings/theme-selector";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Settings" };

const PRIVACY_POINTS = [
  "No account or sign-in. Gospel Labs doesn't know who you are.",
  "No analytics, advertising, or tracking of any kind.",
  "No AI. Your questions and notes are never sent to a model or a server.",
  "Your investigations are stored only in this browser, on this device.",
  "Clearing this site's data in your browser deletes your investigations, so export backups regularly.",
];

export default function SettingsPage() {
  return (
    <PageContainer className="flex flex-col gap-8">
      <PageHeader eyebrow="Settings" title="Preferences & data" />

      <div className="flex flex-col gap-5">
        <SettingsSection
          icon={Palette}
          title="Appearance"
          description="Choose a theme. System follows your device setting. Saved in this browser."
        >
          <ThemeSelector />
        </SettingsSection>

        <SettingsSection
          icon={Database}
          title="Your data"
          description="Back up, restore, or clear the investigations stored on this device."
        >
          <DataManagement />
        </SettingsSection>

        <SettingsSection
          icon={ShieldCheck}
          title="Privacy"
          description="Gospel Labs is designed to keep your personal study private."
        >
          <ul className="flex flex-col gap-3">
            {PRIVACY_POINTS.map((point) => (
              <li key={point} className="flex gap-3 text-sm leading-relaxed text-muted">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                {point}
              </li>
            ))}
          </ul>
          <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-subtle">
            Gospel Labs is an independent study tool and is not an official product of The Church of Jesus Christ of
            Latter-day Saints. It does not provide doctrinal answers or evaluate your conclusions.
          </p>
        </SettingsSection>

        <SettingsSection
          icon={MessageSquare}
          title="Feedback"
          description="Report a problem or suggest an improvement. Every message is read."
        >
          <FeedbackLinks />
        </SettingsSection>
      </div>
    </PageContainer>
  );
}
