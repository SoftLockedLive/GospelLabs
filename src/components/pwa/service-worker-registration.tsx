"use client";

import { useEffect } from "react";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";

/**
 * Registers the offline service worker in production builds. In development
 * it removes any worker left over from a production run, so cached pages
 * never hide code changes.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) void registration.unregister();
      });
      return;
    }
    // Registration failing (e.g. blocked by the browser) only disables offline support.
    navigator.serviceWorker
      .register(`/sw.js?v=${encodeURIComponent(APP_VERSION)}`, { scope: "/" })
      .catch(() => undefined);
  }, []);

  return null;
}
