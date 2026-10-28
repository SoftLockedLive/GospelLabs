import type { Metadata } from "next";
import { FeedbackLinks } from "@/components/settings/feedback-links";
import { SettingsPage } from "@/components/settings/settings-page";

export const metadata: Metadata = { title: "Send feedback" };

export default function FeedbackSettingsPage() {
  return (
    <SettingsPage title="Send feedback" description="Report a problem or suggest an improvement. Every message is read.">
      <FeedbackLinks />
    </SettingsPage>
  );
}
