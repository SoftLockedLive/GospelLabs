import { Suspense, type ReactNode } from "react";
import { OfflineNotice } from "@/components/pwa/offline-notice";
import { UpdateNotice } from "@/components/pwa/update-notice";
import { Brand } from "./brand";
import { NavLinkList, NavLinks } from "./nav-links";

/**
 * Responsive application frame: a fixed sidebar on large screens, and a top
 * bar plus bottom tab bar on phones and tablets.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-accent-fg"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-canvas lg:flex">
        <div className="px-5 pt-6 pb-8">
          <Brand />
        </div>
        <nav aria-label="Primary" className="flex-1 px-3">
          {/* usePathname suspends on routes whose params are only known at request time. */}
          <Suspense fallback={<NavLinkList variant="sidebar" pathname={null} />}>
            <NavLinks variant="sidebar" />
          </Suspense>
        </nav>
        <div className="m-3 rounded-lg border border-line bg-surface px-4 py-3.5">
          <p className="text-xs font-medium text-fg">Private by design</p>
          <p className="mt-1 text-xs leading-relaxed text-subtle">
            No accounts, no tracking. Your study stays on this device.
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center border-b border-line bg-canvas/85 px-4 backdrop-blur-md sm:px-6 lg:hidden">
          <Brand />
        </header>

        <UpdateNotice />
        <OfflineNotice />
        <main id="main" className="bg-notebook-grid flex-1 pb-24 lg:pb-0">
          {children}
        </main>
      </div>

      <nav
        aria-label="Primary"
        className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/90 px-2 backdrop-blur-md lg:hidden"
      >
        <Suspense fallback={<NavLinkList variant="bottom" pathname={null} />}>
          <NavLinks variant="bottom" />
        </Suspense>
      </nav>
    </div>
  );
}

/** Standard page width and padding used by every top-level screen. */
export function PageContainer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-12 ${className}`}>
      {children}
    </div>
  );
}
