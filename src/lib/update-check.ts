/**
 * Detects that a different build of Gospel Labs has been deployed since this
 * page loaded, by comparing this build's identifier with /version.json.
 */
import { APP_VERSION } from "./app-version";

export const VERSION_URL = "/version.json";

/** What /version.json says about the deployed build. Everything but `version` is optional (added in 2.1). */
export interface DeployedInfo {
  version: string;
  release?: string;
  title?: string;
  highlights?: string[];
}

/**
 * The deployed build's details, or null if they can't be read (offline, an
 * older deployment without the file, or an unexpected response). Always
 * fetched fresh: the query string and `no-store` keep every cache out of it.
 */
export async function fetchDeployedInfo(fetcher: typeof fetch = fetch): Promise<DeployedInfo | null> {
  try {
    const response = await fetcher(`${VERSION_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as Record<string, unknown> | null;
    const version = data?.version;
    if (typeof version !== "string" || !version) return null;
    const text = (value: unknown, max: number) => (typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined);
    const highlights = Array.isArray(data?.highlights)
      ? data.highlights.map((item) => text(item, 240)).filter((item): item is string => !!item).slice(0, 3)
      : undefined;
    return { version, release: text(data?.release, 20), title: text(data?.title, 80), highlights: highlights?.length ? highlights : undefined };
  } catch {
    return null;
  }
}

/** The deployed build's identifier, or null if it can't be read. */
export async function fetchDeployedVersion(fetcher: typeof fetch = fetch): Promise<string | null> {
  return (await fetchDeployedInfo(fetcher))?.version ?? null;
}

/** True when a different build is deployed. Any difference counts, including a rollback. */
export function isUpdateAvailable(deployed: string | null, current: string = APP_VERSION): boolean {
  return deployed !== null && deployed !== current;
}
