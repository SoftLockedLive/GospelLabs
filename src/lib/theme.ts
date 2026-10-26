/**
 * Appearance preference. This is a UI convenience stored in localStorage and
 * is intentionally separate from study data. The key is unchanged since 1.0,
 * so earlier versions still read it (they show any theme they don't know as dark).
 *
 * Themes share one layout and component system; each is a set of color
 * tokens in globals.css under :root[data-theme="…"].
 */
export const THEMES = ["dark", "light", "dawn", "evening"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_PREFERENCES = [...THEMES, "system"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const THEME_LABELS: Record<ThemePreference, string> = {
  dark: "Lab",
  light: "Daylight",
  dawn: "Parchment",
  evening: "Evening",
  system: "System",
};

export const THEME_DESCRIPTIONS: Record<ThemePreference, string> = {
  dark: "Deep teal, the original Gospel Labs look",
  light: "Clean and bright",
  dawn: "Warm paper tones for long reading",
  evening: "Soft indigo and gold, easy on the eyes at night",
  system: "Lab or Daylight, following your device",
};

/** Themes with a light background; used for the browser's color-scheme and theme-color. */
export const LIGHT_THEMES: readonly Theme[] = ["light", "dawn"];

export const THEME_STORAGE_KEY = "gospel-labs:theme";
const THEME_CHANGE_EVENT = "gospel-labs:theme-change";

export function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_PREFERENCES.includes(value as ThemePreference);
}

export function readThemePreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : "dark";
  } catch {
    return "dark";
  }
}

export function setThemePreference(preference: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage may be unavailable (private mode); the theme still applies for this visit.
  }
  window.__gospelLabsApplyTheme?.(preference);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function subscribeToThemePreference(onChange: () => void): () => void {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Runs before first paint (inlined in <head>) so the stored theme and motion
 * preference apply without a flash. Also follows OS changes while the theme
 * preference is "system" or motion follows the system.
 *
 * Motion: <html data-motion="full|subtle|off">. "system" (the default) is
 * "off" when the OS asks for reduced motion, otherwise "subtle".
 */
export const themeInitScript = `(function(){
  var key = ${JSON.stringify(THEME_STORAGE_KEY)};
  var prefsKey = "gospel-labs:preferences";
  var themes = ${JSON.stringify(THEMES)};
  var mq = window.matchMedia("(prefers-color-scheme: light)");
  var rm = window.matchMedia("(prefers-reduced-motion: reduce)");
  function stored(){ try { return localStorage.getItem(key) || "dark"; } catch (e) { return "dark"; } }
  function motionPref(){ try { var p = JSON.parse(localStorage.getItem(prefsKey) || "{}"); return p && p.motion || "system"; } catch (e) { return "system"; } }
  function apply(pref){
    var theme = pref === "system" ? (mq.matches ? "light" : "dark") : (themes.indexOf(pref) >= 0 ? pref : "dark");
    document.documentElement.dataset.theme = theme;
  }
  function applyMotion(pref){
    var m = pref === "full" || pref === "subtle" || pref === "off" ? pref : (rm.matches ? "off" : "subtle");
    document.documentElement.dataset.motion = m;
  }
  window.__gospelLabsApplyTheme = apply;
  window.__gospelLabsApplyMotion = applyMotion;
  mq.addEventListener("change", function(){ if (stored() === "system") apply("system"); });
  rm.addEventListener("change", function(){ applyMotion(motionPref()); });
  apply(stored());
  applyMotion(motionPref());
})();`;

declare global {
  interface Window {
    __gospelLabsApplyTheme?: (preference: ThemePreference) => void;
    __gospelLabsApplyMotion?: (preference: string) => void;
  }
}
