/**
 * Appearance preference. This is a UI convenience stored in localStorage and
 * is intentionally separate from investigation data.
 */
export const THEME_PREFERENCES = ["dark", "light", "system"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const THEME_STORAGE_KEY = "gospel-labs:theme";
const THEME_CHANGE_EVENT = "gospel-labs:theme-change";

function isThemePreference(value: unknown): value is ThemePreference {
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
 * Runs before first paint (inlined in <head>) so the stored theme applies
 * without a flash. Also follows OS changes while the preference is "system".
 */
export const themeInitScript = `(function(){
  var key = ${JSON.stringify(THEME_STORAGE_KEY)};
  var mq = window.matchMedia("(prefers-color-scheme: light)");
  function stored(){ try { return localStorage.getItem(key) || "dark"; } catch (e) { return "dark"; } }
  function apply(pref){
    var theme = pref === "system" ? (mq.matches ? "light" : "dark") : (pref === "light" ? "light" : "dark");
    document.documentElement.dataset.theme = theme;
  }
  window.__gospelLabsApplyTheme = apply;
  mq.addEventListener("change", function(){ if (stored() === "system") apply("system"); });
  apply(stored());
})();`;

declare global {
  interface Window {
    __gospelLabsApplyTheme?: (preference: ThemePreference) => void;
  }
}
