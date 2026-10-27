"use client";

import { WifiOff } from "lucide-react";
import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/** Tells the user what does and doesn't work while the device is offline. */
export function OfflineNotice() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  if (online) return null;

  return (
    <div role="status" className="border-b border-amber/30 bg-amber-soft px-4 py-2.5 text-sm text-fg sm:px-6 lg:px-10">
      <p className="mx-auto flex max-w-6xl items-start gap-2">
        <WifiOff aria-hidden className="mt-0.5 size-4 shrink-0 text-amber" />
        <span>
          <strong className="font-semibold">You&rsquo;re offline.</strong> Everything you&rsquo;ve saved is on this
          device and keeps working. Links to ChurchofJesusChrist.org need an internet connection.
        </span>
      </p>
    </div>
  );
}
