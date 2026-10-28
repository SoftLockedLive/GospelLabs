import { Database, GraduationCap, Info, MessageSquare, Palette, ShieldCheck, type LucideIcon } from "lucide-react";

export interface SettingsPageLink {
  href: string;
  title: string;
  /** One line under the title in the Settings list. */
  description: string;
  icon: LucideIcon;
}

/**
 * Settings, one page per topic (3.0): the list at /settings stays short, the way a phone's own settings do, and
 * each page holds one kind of thing.
 */
export const SETTINGS_PAGES: readonly SettingsPageLink[] = [
  { href: "/settings/appearance", title: "Appearance", description: "Theme and motion", icon: Palette },
  { href: "/settings/study", title: "Study", description: "Session length, difficulty, and activity options", icon: GraduationCap },
  { href: "/settings/data", title: "Backup and data", description: "Back up, restore, or delete what’s saved on this device", icon: Database },
  { href: "/settings/privacy", title: "Privacy", description: "What Gospel Labs keeps, and where", icon: ShieldCheck },
  { href: "/settings/feedback", title: "Send feedback", description: "Report a problem or suggest an idea", icon: MessageSquare },
  { href: "/settings/about", title: "About Gospel Labs", description: "Your version, what’s new, and art credits", icon: Info },
];
