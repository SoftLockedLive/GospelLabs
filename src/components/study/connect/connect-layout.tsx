/**
 * The quiet frame around Connect with Christ: a warm, full-width reading
 * surface with a narrow centered column, distinct from the rest of the app.
 * Server-safe (no hooks), so the static page can render it before scripts load.
 */
import type { ReactNode } from "react";
import { LoadingRegion, Skeleton, SkeletonText } from "@/components/ui/skeleton";

export function ConnectFrame({ children }: { children: ReactNode }) {
  return (
    // The sacred surface covers the page wash and grid behind <main>.
    <div className="relative min-h-[calc(100dvh-4rem)] bg-sacred text-sacred-fg lg:min-h-dvh">
      <div className="mx-auto w-full max-w-[38rem] px-4 pt-10 pb-16 sm:px-6 sm:pt-14 lg:pt-20 lg:pb-24">{children}</div>
    </div>
  );
}

export function ConnectHeader() {
  return (
    <header className="text-center">
      <p className="text-xs font-medium tracking-[0.2em] text-sacred-accent uppercase">Five quiet minutes</p>
      <h1 className="mt-3 font-serif text-3xl font-medium tracking-tight text-balance sm:text-4xl">Connect with Christ</h1>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-pretty text-sacred-muted">
        A quiet space to come to know the Savior. About five minutes. There’s no timer.
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
