import { ShieldCheck } from "lucide-react";
import { Suspense, type ReactNode } from "react";
import { OfflineNotice } from "@/components/pwa/offline-notice";
import { UpdateNotice } from "@/components/pwa/update-notice";
import { WhatsNew } from "@/components/release/whats-new";
import { cn } from "@/lib/cn";
import { Brand } from "./brand";
import { BottomNav, BottomNavList, SidebarNav, SidebarNavList } from "./nav-links";

/**
 * Responsive application frame: a grouped sidebar on large screens (Study,
 * Your discoveries, Research, Settings), and a top bar plus a bottom tab bar
 * with a More menu on phones and tablets.
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
        <div className="px-5 pt-5 pb-5">
          <Brand />
        </div>
        <nav aria-label="Primary" className="scrollbar-none flex-1 overflow-y-auto px-3 pb-3">
          {/* usePathname suspends on routes whose params are only known at request time. */}
          <Suspense fallback={<SidebarNavList pathname={null} />}>
            <SidebarNav />
          </Suspense>
        </nav>
        <div className="m-3 mt-0 rounded-xl border border-line bg-surface px-4 py-3.5">
          <p className="flex items-center gap-2 text-xs font-medium text-fg">
            <ShieldCheck aria-hidden className="size-3.5 text-accent" />
            Private by design
          </p>
          <p className="mt-1 text-xs leading-relaxed text-subtle">No accounts, no tracking. Your study stays on this device.</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center border-b border-line bg-canvas/85 px-4 backdrop-blur-md sm:px-6 lg:hidden">
          <Brand />
        </header>

        <UpdateNotice />
        <OfflineNotice />
        <WhatsNew />
        {/* overflow-x-clip: anything too wide is cut off here instead of widening the page, which on phones also
            pushes the fixed tab bar off screen. e2e/study-responsive.spec.ts still finds such elements. */}
        <main id="main" className="relative isolate flex-1 overflow-x-clip pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0">
          <div aria-hidden className="bg-page-wash pointer-events-none absolute inset-x-0 top-0 -z-10 h-128" />
          <div aria-hidden className="bg-notebook-grid pointer-events-none absolute inset-0 -z-10" />
          {children}
        </main>
      </div>

      <nav
        aria-label="Primary"
        className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/90 px-0.5 backdrop-blur-md min-[360px]:px-1.5 lg:hidden"
      >
        <Suspense fallback={<BottomNavList pathname={null} />}>
          <BottomNav />
        </Suspense>
      </nav>
    </div>
  );
}

/** Standard page width and padding used by every top-level screen. */
export function PageContainer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-12", className)}>{children}</div>;
}

/** A narrower column for reading-focused pages (Connect with Christ, a passage, a card). */
export function ReadingContainer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10 lg:py-12", className)}>{children}</div>;
}
