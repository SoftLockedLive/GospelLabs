/**
 * Detects that a different build of Gospel Labs has been deployed since this
 * page loaded, by comparing this build's identifier with /version.json.
 */
import { APP_VERSION } from "./app-version";

export const VERSION_URL = "/version.json";

/**
 * The deployed build's identifier, or null if it can't be read (offline, an
 * older deployment without the file, or an unexpected response). Always
 * fetched fresh: the query string and `no-store` keep every cache out of it.
 */
export async function fetchDeployedVersion(fetcher: typeof fetch = fetch): Promise<string | null> {
  try {
    const response = await fetcher(`${VERSION_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    const version = (data as { version?: unknown } | null)?.version;
    return typeof version === "string" && version ? version : null;
  } catch {
    return null;
  }
}

/** True when a different build is deployed. Any difference counts, including a rollback. */
export function isUpdateAvailable(deployed: string | null, current: string = APP_VERSION): boolean {
  return deployed !== null && deployed !== current;
}
