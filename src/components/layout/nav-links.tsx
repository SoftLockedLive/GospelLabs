"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { NAV_ITEMS, isNavItemActive } from "./nav-items";

interface NavLinksProps {
  variant: "sidebar" | "bottom";
}

export function NavLinks({ variant }: NavLinksProps) {
  const pathname = usePathname();
  return <NavLinkList variant={variant} pathname={pathname} />;
}

/** Renders the nav without an active item; used as the Suspense fallback. */
export function NavLinkList({ variant, pathname }: NavLinksProps & { pathname: string | null }) {
  return (
    <ul className={variant === "sidebar" ? "flex flex-col gap-1" : "grid grid-cols-4"}>
      {NAV_ITEMS.map((item) => {
        const active = pathname !== null && isNavItemActive(item, pathname);
        const Icon = item.icon;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "transition-colors",
                variant === "sidebar"
                  ? "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium"
                  : "flex flex-col items-center gap-1 rounded-lg px-1 pt-2.5 pb-2 text-[11px] font-medium",
                active
                  ? variant === "sidebar"
                    ? "bg-accent-soft text-fg"
                    : "text-accent"
                  : "text-muted hover:text-fg",
                variant === "sidebar" && !active && "hover:bg-surface-raised",
              )}
            >
              <Icon aria-hidden className={cn("size-[18px]", active && "text-accent")} />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
