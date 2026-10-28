/**
 * The quiet frame around Connect with Christ: a warm, full-width reading
 * surface with a narrow centered column, distinct from the rest of the app.
 * Server-safe (no hooks), so the static page can render it before scripts load.
 */
import type { ReactNode } from "react";
import { ArtImage } from "@/components/ui/art-image";
import { LoadingRegion, Skeleton, SkeletonText } from "@/components/ui/skeleton";

export function ConnectFrame({ children }: { children: ReactNode }) {
  return (
    // The sacred surface fills the screen, and below lg also the space <main> keeps clear of the tab bar.
    <div className="relative -mb-[calc(6rem+env(safe-area-inset-bottom))] min-h-dvh bg-sacred pb-[calc(6rem+env(safe-area-inset-bottom))] text-sacred-fg lg:mb-0 lg:pb-0">
      <div className="mx-auto w-full max-w-[38rem] px-4 pt-10 pb-16 sm:px-6 sm:pt-14 lg:pt-20 lg:pb-24">{children}</div>
    </div>
  );
}

export function ConnectHeader() {
  return (
    <header className="text-center">
      <ArtImage use="connect" ratio="square" decorative sizes="6rem" priority className="mx-auto mb-5 size-24 rounded-full ring-1 ring-sacred-line" />
      <p className="scripture-caps text-sacred-accent">A few quiet minutes</p>
      <h1 className="text-title mt-2">Connect with Christ</h1>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-pretty text-sacred-muted">
        A quiet space to come to know the Savior. There’s no timer.
      </p>
    </header>
  );
}

/** Shown while the page reads which sessions were opened recently. */
export function ConnectLoading() {
  return (
    <LoadingRegion label="Preparing today’s session" className="mt-10">
      <Skeleton className="mx-auto h-12 w-full max-w-md rounded-2xl" />
      <Skeleton className="mx-auto mt-12 h-7 w-2/3" />
      <SkeletonText lines={4} className="mt-8" />
    </LoadingRegion>
  );
}

/** A thin centered rule between parts of a session. */
export function Rest() {
  return <div aria-hidden className="mx-auto my-10 h-px w-12 bg-sacred-line sm:my-12" />;
}
