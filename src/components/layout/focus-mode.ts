"use client";

import { useEffect } from "react";

let holders = 0;

/**
 * While `active`, phones and tablets hide the tab bar (and the space kept for it), the way a scripture reader
 * hides its chrome: a study step gets the whole screen and shows its own way back. Large screens keep the
 * sidebar. Sets <html data-chrome="focus">; the CSS is in globals.css.
 */
export function useFocusMode(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    holders++;
    root.dataset.chrome = "focus";
    return () => {
      holders--;
      if (holders === 0) delete root.dataset.chrome;
    };
  }, [active]);
}
