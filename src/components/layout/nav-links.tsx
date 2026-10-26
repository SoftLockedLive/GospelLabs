"use client";

import { Ellipsis, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import { MORE_GROUPS, NAV_GROUPS, SETTINGS_ITEM, TAB_ITEMS, isInMore, isNavItemActive, type NavItem } from "./nav-items";

// --- Sidebar (large screens) --------------------------------------------------------

/** The grouped sidebar navigation. Reads the current path to mark the active item. */
export function SidebarNav() {
  return <SidebarNavList pathname={usePathname()} />;
}

/** The sidebar without an active item; also the Suspense fallback. */
export function SidebarNavList({ pathname }: { pathname: string | null }) {
  const baseId = useId();
  return (
    <div className="flex min-h-full flex-col gap-6">
      {NAV_GROUPS.map((group) => {
        // Group names are not headings, so they don't add to each page's outline.
        const labelId = `${baseId}-${group.id}`;
        return (
          <div key={group.id}>
            <p id={labelId} className="mb-1.5 px-3 text-[11px] font-semibold tracking-[0.08em] text-subtle uppercase">
              {group.label}
            </p>
            <ul aria-labelledby={labelId} className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <SidebarLink item={item} active={pathname !== null && isNavItemActive(item, pathname)} />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <ul className="mt-auto border-t border-line pt-3">
        <li>
          <SidebarLink item={SETTINGS_ITEM} active={pathname !== null && isNavItemActive(SETTINGS_ITEM, pathname)} />
        </li>
      </ul>
    </div>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
        active ? "bg-accent-soft text-fg" : "text-muted hover:bg-surface-raised hover:text-fg",
      )}
    >
      {active && <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent" />}
      <Icon aria-hidden className={cn("size-4.5 shrink-0 transition-colors", active ? "text-accent" : "text-subtle group-hover:text-fg")} />
      {item.label}
    </Link>
  );
}

// --- Tab bar (phones and tablets) ---------------------------------------------------

/** The bottom tab bar: Home, Investigate, Notebook, Map, and More. */
export function BottomNav() {
  return <BottomNavList pathname={usePathname()} />;
}

/** The tab bar without an active item; also the Suspense fallback. */
export function BottomNavList({ pathname }: { pathname: string | null }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = pathname !== null && isInMore(pathname);
  return (
    <>
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {TAB_ITEMS.map((item) => {
          const active = pathname !== null && isNavItemActive(item, pathname);
          return (
            <li key={item.href}>
              <Link href={item.href} aria-current={active ? "page" : undefined} className={tabClasses(active)}>
                <TabIcon item={item} active={active} />
                <span className="max-w-full truncate">{item.shortLabel ?? item.label}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            // Says which section is current when it's one of those under More.
            aria-current={moreActive ? "page" : undefined}
            onClick={() => setMoreOpen(true)}
            className={cn(tabClasses(moreActive), "w-full")}
          >
            <span className={iconPill(moreActive)}>
              <Ellipsis aria-hidden className="size-5" />
            </span>
            <span>More</span>
          </button>
        </li>
      </ul>
      <MoreMenu open={moreOpen} onClose={() => setMoreOpen(false)} pathname={pathname} />
    </>
  );
}

const tabClasses = (active: boolean) =>
  cn(
    "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl pt-1.5 pb-1 text-[11px] font-medium tracking-tight transition-colors",
    active ? "text-fg" : "text-muted hover:text-fg",
  );

const iconPill = (active: boolean) =>
  cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", active ? "bg-accent-soft text-accent" : "text-current");

function TabIcon({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <span className={iconPill(active)}>
      <Icon aria-hidden className="size-5" />
    </span>
  );
}

/** Everything that isn't in the tab bar: the other study tools, Research, and Settings. */
function MoreMenu({ open, onClose, pathname }: { open: boolean; onClose: () => void; pathname: string | null }) {
  const baseId = useId();
  return (
    <Sheet open={open} onClose={onClose} title="More">
      <nav aria-label="More" className="flex flex-col gap-5 pt-1">
        {MORE_GROUPS.map((group, groupIndex) => {
          const labelId = `${baseId}-${group.id}`;
          return (
            <div key={group.id}>
              <p id={labelId} className="mb-1 px-3 text-[11px] font-semibold tracking-[0.08em] text-subtle uppercase">
                {group.label}
              </p>
              <ul aria-labelledby={labelId} className="flex flex-col">
                {group.items.map((item, index) => (
                  <li key={item.href}>
                    <MoreLink
                      item={item}
                      active={pathname !== null && isNavItemActive(item, pathname)}
                      onNavigate={onClose}
                      autoFocus={groupIndex === 0 && index === 0}
                    />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        <ul className="border-t border-line pt-2">
          <li>
            <MoreLink item={SETTINGS_ITEM} active={pathname !== null && isNavItemActive(SETTINGS_ITEM, pathname)} onNavigate={onClose} />
          </li>
        </ul>
        <p className="flex items-start gap-2.5 px-3 text-xs leading-relaxed text-subtle">
          <ShieldCheck aria-hidden className="mt-px size-4 shrink-0 text-accent" />
          Private by design. No accounts or tracking; everything you study stays on this device.
        </p>
      </nav>
    </Sheet>
  );
}

function MoreLink({ item, active, onNavigate, autoFocus }: { item: NavItem; active: boolean; onNavigate: () => void; autoFocus?: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      data-autofocus={autoFocus ? "" : undefined}
      onClick={onNavigate}
      className={cn(
        "flex min-h-14 items-center gap-3.5 rounded-xl px-3 py-2 transition-colors",
        active ? "bg-accent-soft" : "hover:bg-surface-raised",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl border",
          active ? "border-accent/40 bg-surface text-accent" : "border-line bg-surface-sunken text-muted",
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-sm font-medium text-fg">{item.label}</span>
        {item.description && <span className="text-xs text-muted">{item.description}</span>}
      </span>
    </Link>
  );
}
