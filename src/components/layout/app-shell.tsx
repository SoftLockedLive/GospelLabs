import { Suspense, type ReactNode } from "react";
import { OfflineNotice } from "@/components/pwa/offline-notice";
import { UpdateNotice } from "@/components/pwa/update-notice";
import { WhatsNew } from "@/components/release/whats-new";
import { cn } from "@/lib/cn";
import { Brand } from "./brand";
import { BottomNav, BottomNavList, SidebarNav, SidebarNavList } from "./nav-links";

/**
 * Responsive application frame: a grouped sidebar on large screens (Study,
 * Discoveries, Research, Settings), and a bottom tab bar with a More menu on
 * phones and tablets. Phones have no top bar (3.0): each page starts with its
 * own title, so the first screen goes to what the learner came for. A study
 * step hides the tab bar too (useFocusMode), and shows its own slim bar.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-accent-fg"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-canvas lg:flex">
        <div className="px-6 pt-6 pb-6">
          <Brand showTagline={false} />
        </div>
        <nav aria-label="Primary" className="scrollbar-none flex-1 overflow-y-auto px-3 pb-3">
          {/* usePathname suspends on routes whose params are only known at request time. */}
          <Suspense fallback={<SidebarNavList pathname={null} />}>
            <SidebarNav />
          </Suspense>
        </nav>
        <p className="px-6 pt-1 pb-5 text-[13px] leading-snug text-subtle">No accounts or tracking. Your study stays on this device.</p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">

        <UpdateNotice />
        <OfflineNotice />
        <WhatsNew />
        {/* overflow-x-clip: anything too wide is cut off here instead of widening the page, which on phones also
            pushes the fixed tab bar off screen. e2e/study-responsive.spec.ts still finds such elements. */}
        <main id="main" className="relative isolate flex-1 overflow-x-clip pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0">
          {children}
        </main>
      </div>

      <nav
        aria-label="Primary"
        data-tabbar
        className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas px-0.5 min-[360px]:px-1.5 lg:hidden"
      >
        <Suspense fallback={<BottomNavList pathname={null} />}>
          <BottomNav />
        </Suspense>
      </nav>
    </div>
  );
}

/** Standard page width and padding used by every top-level screen. Phones get a 20px gutter, like a printed page's margin. */
export function PageContainer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-5 pt-6 pb-8 sm:px-6 sm:py-10 lg:px-10 lg:py-12", className)}>{children}</div>;
}

/** A narrower column for reading-focused pages (Connect with Christ, a passage, a card). */
export function ReadingContainer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-3xl px-5 pt-6 pb-8 sm:px-6 sm:py-10 lg:py-12", className)}>{children}</div>;
}
