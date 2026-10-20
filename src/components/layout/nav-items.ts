import { BookOpen, LayoutDashboard, Library, Settings, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Additional path prefixes that should highlight this item. */
  matches?: string[];
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/questions", label: "Question Bank", icon: BookOpen },
  { href: "/library", label: "My Library", icon: Library, matches: ["/investigations"] },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/") return pathname === "/";
  return [item.href, ...(item.matches ?? [])].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
