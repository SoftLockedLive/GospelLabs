"use client";

import { useSyncExternalStore } from "react";

let clientDate: Date | null = null;
const noSubscription = () => () => undefined;

/**
 * Today's date in the browser, or null while the static page is being
 * rendered and hydrated (it was built ahead of time, so the server's clock
 * says nothing about the learner's day). Fixed for the life of the page.
 */
export function useClientDate(): Date | null {
  return useSyncExternalStore(
    noSubscription,
    () => (clientDate ??= new Date()),
    () => null,
  );
}
