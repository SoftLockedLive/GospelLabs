import { Database, GraduationCap, Info, MessageSquare, Palette, ShieldCheck, Wind } from "lucide-react";
import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/app-shell";
import { AboutVersion } from "@/components/release/about-version";
import { DataManagement } from "@/components/settings/data-management";
import { FeedbackLinks } from "@/components/settings/feedback-links";
import { MotionSelector } from "@/components/settings/motion-selector";
import { SettingsSection } from "@/components/settings/settings-section";
import { StudyPreferences } from "@/components/settings/study-preferences";
import { ThemeSelector } from "@/components/settings/theme-selector";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Settings" };

const PRIVACY_POINTS = [
  "No account or sign-in. Gospel Labs doesn't know who you are.",
  "No analytics, advertising, or tracking of any kind.",
  "No AI. Your answers, reflections, and notes are never sent to a model or a server, and no AI features are turned on.",
  "Your research notebooks and study data (progress, Discovery Cards, Map connections, explorations, and notes) and your preferences are stored only in this browser, on this device, and are included in your backups. Nothing goes to a cloud service.",
  "Progress records what you've studied, never scores, streaks, or how spiritual you are.",
  "Clearing this site's data in your browser deletes everything you've saved here, so export backups regularly.",
];

export default function SettingsPage() {
  return (
    <PageContainer className="flex flex-col gap-8">
      <PageHeader eyebrow="Settings" title="Preferences & data" />

      <div className="flex flex-col gap-5">
        <SettingsSection
          icon={Palette}
          title="Appearance"
          description="Choose a theme. Every theme has the same layout; Parchment is made for long reading. System follows your device. Saved in this browser."
        >
          <ThemeSelector />
        </SettingsSection>

        <SettingsSection
          icon={Wind}
          title="Motion"
          description="How much the interface moves when content appears or an answer is confirmed. Motion is always gentle and never required to understand anything."
        >
          <MotionSelector />
        </SettingsSection>

        <SettingsSection
          icon={GraduationCap}
          title="Study preferences"
          description="Starting points for new investigations. You can change any of these while you study."
        >
          <StudyPreferences />
        </SettingsSection>

        <SettingsSection
          icon={Database}
          title="Your data"
          description="Back up, restore, or clear your investigations and study data stored on this device: research notebooks, study progress, Discovery Cards, Map connections, explorations, and preferences."
        >
          <DataManagement />
        </SettingsSection>

        <SettingsSection icon={ShieldCheck} title="Privacy" description="Gospel Labs is designed to keep your personal study private.">
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
            Latter-day Saints. Explanations written by Gospel Labs are labeled as suggestions; they are not doctrine or
            revelation, and nothing in the app evaluates your conclusions or your testimony.
          </p>
        </SettingsSection>

        <SettingsSection
          icon={MessageSquare}
          title="Feedback"
          description="Report a problem or suggest an improvement. Every message is read."
        >
          <FeedbackLinks />
        </SettingsSection>

        <SettingsSection icon={Info} title="About" description="Your version of Gospel Labs, and what changed in each release.">
          <AboutVersion />
        </SettingsSection>
      </div>
    </PageContainer>
  );
}
