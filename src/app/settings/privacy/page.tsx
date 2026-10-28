import type { Metadata } from "next";
import { SettingsPage } from "@/components/settings/settings-page";

export const metadata: Metadata = { title: "Privacy" };

const PRIVACY_POINTS = [
  "No account or sign-in. Gospel Labs doesn’t know who you are.",
  "No analytics, advertising, or tracking of any kind.",
  "No AI. Your answers, reflections, journal, and notes are never sent to a model or a server, and no AI features are turned on.",
  "Your research notebooks, investigation progress, Discovery Cards, journal, Map connections, notes, highlights, and preferences are stored only in this browser, on this device, and are included in your backups. Nothing goes to a cloud service.",
  "Progress records what you’ve studied, never scores, streaks, or how spiritual you are.",
  "Clearing this site’s data in your browser deletes everything you’ve saved here, so export backups regularly.",
];

export default function PrivacySettingsPage() {
  return (
    <SettingsPage title="Privacy" description="Gospel Labs is designed to keep your personal study private.">
      <ul className="flex list-disc flex-col gap-3 pl-5 text-base leading-relaxed text-fg marker:text-muted">
        {PRIVACY_POINTS.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <p className="border-t border-line pt-5 text-sm leading-relaxed text-muted">
        Gospel Labs is an independent study tool and is not an official product of The Church of Jesus Christ of
        Latter-day Saints. Explanations written by Gospel Labs are labeled as suggestions; they are not doctrine or
        revelation, and nothing in the app evaluates your conclusions or your testimony.
      </p>
    </SettingsPage>
  );
}
