"use client";

import { useEffect } from "react";

/**
 * Keeps the browser's theme color (the address bar and the installed app's
 * title bar) in step with the chosen theme: it copies the active theme's
 * --canvas into <meta name="theme-color">. Renders nothing.
 */
export function ThemeColorSync() {
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const canvas = getComputedStyle(root).getPropertyValue("--canvas").trim();
      if (!canvas) return;
      const metas = document.head.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
      if (metas.length === 0) {
        const meta = document.createElement("meta");
        meta.name = "theme-color";
        meta.content = canvas;
        document.head.appendChild(meta);
        return;
      }
      for (const meta of metas) {
        if (meta.content !== canvas) meta.content = canvas;
      }
    };
    apply();
    const themeObserver = new MutationObserver(apply);
    themeObserver.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    // Navigation can re-render the head's metadata; reapply when it does.
    const headObserver = new MutationObserver(apply);
    headObserver.observe(document.head, { childList: true });
    return () => {
      themeObserver.disconnect();
      headObserver.disconnect();
    };
  }, []);
  return null;
}
