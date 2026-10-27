import {
  BookOpen,
  BookOpenText,
  Compass,
  HeartHandshake,
  House,
  Library,
  NotebookPen,
  Settings,
  Sparkles,
  Waypoints,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  /** A shorter label for the phone tab bar, when the full label is long. */
  shortLabel?: string;
  icon: LucideIcon;
  /** Additional path prefixes that should highlight this item. */
  matches?: string[];
  /** One line shown in the More menu. */
  description?: string;
}

export interface NavGroup {
  id: "study" | "discoveries" | "research";
  label: string;
  items: readonly NavItem[];
}

export const HOME_ITEM: NavItem = { href: "/", label: "Home", icon: House };

export const INVESTIGATE_ITEM: NavItem = {
  href: "/investigate",
  label: "Investigate",
  icon: Compass,
  description: "Guided investigations of gospel questions",
};

export const EXPLORER_ITEM: NavItem = {
  href: "/explore",
  label: "Scripture Explorer",
  shortLabel: "Explore",
  icon: BookOpenText,
  description: "Read a passage closely, phrase by phrase",
};

export const CHARACTER_ITEM: NavItem = {
  href: "/character",
  label: "Character of Christ",
  shortLabel: "Character",
  icon: Sparkles,
  description: "Study His attributes and how He showed them",
};

export const CONNECT_ITEM: NavItem = {
  href: "/connect",
  label: "Connect with Christ",
  shortLabel: "Connect",
  icon: HeartHandshake,
  description: "A few quiet minutes with the Savior",
};

export const NOTEBOOK_ITEM: NavItem = {
  href: "/notebook",
  label: "Notebook",
  icon: NotebookPen,
  description: "Your Discovery Cards",
};

export const MAP_ITEM: NavItem = {
  href: "/map",
  label: "Discovery Map",
  shortLabel: "Map",
  icon: Waypoints,
  description: "How your discoveries connect",
};

export const QUESTION_BANK_ITEM: NavItem = {
  href: "/questions",
  label: "Question Bank",
  icon: BookOpen,
  description: "Curated questions to research on your own",
};

export const LIBRARY_ITEM: NavItem = {
  href: "/library",
  label: "My Library",
  icon: Library,
  matches: ["/investigations"],
  description: "Your research notebooks",
};

export const SETTINGS_ITEM: NavItem = {
  href: "/settings",
  label: "Settings",
  icon: Settings,
  description: "Appearance, study preferences, and your data",
};

/** The sidebar's information architecture. Settings sits apart, at the bottom. */
export const NAV_GROUPS: readonly NavGroup[] = [
  { id: "study", label: "Study", items: [HOME_ITEM, INVESTIGATE_ITEM, EXPLORER_ITEM, CHARACTER_ITEM, CONNECT_ITEM] },
  { id: "discoveries", label: "Discoveries", items: [NOTEBOOK_ITEM, MAP_ITEM] },
  { id: "research", label: "Research", items: [QUESTION_BANK_ITEM, LIBRARY_ITEM] },
];

/** Every destination, in sidebar order (kept for code written against 1.x). */
export const NAV_ITEMS: readonly NavItem[] = [...NAV_GROUPS.flatMap((group) => group.items), SETTINGS_ITEM];

/** The phone and tablet tab bar; everything else is under More. */
export const TAB_ITEMS: readonly NavItem[] = [HOME_ITEM, INVESTIGATE_ITEM, NOTEBOOK_ITEM, MAP_ITEM];

/** Sections of the More menu on phones and tablets. */
export const MORE_GROUPS: readonly NavGroup[] = [
  { id: "study", label: "Study", items: [EXPLORER_ITEM, CHARACTER_ITEM, CONNECT_ITEM] },
  { id: "research", label: "Research", items: [QUESTION_BANK_ITEM, LIBRARY_ITEM] },
];

export const MORE_ITEMS: readonly NavItem[] = [...MORE_GROUPS.flatMap((group) => group.items), SETTINGS_ITEM];

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/") return pathname === "/";
  return [item.href, ...(item.matches ?? [])].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** True when the current page lives under More, so the More tab shows as current. */
export const isInMore = (pathname: string) => MORE_ITEMS.some((item) => isNavItemActive(item, pathname));
