"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { isQuietUpdate } from "@/domain/changelog";
import { APP_RELEASE } from "@/lib/app-version";
import { saveAllWork, unsavedDrafts } from "@/lib/unsaved-work";
import { fetchDeployedInfo, isUpdateAvailable, type DeployedInfo } from "@/lib/update-check";

const CHECK_INTERVAL_MS = 30 * 60 * 1000;

type Problem = { kind: "drafts"; names: string[] } | { kind: "unsaved" } | null;

/**
 * Tells the user when a different build of Gospel Labs has been deployed,
 * and reloads only after everything in the page has been saved.
 *
 * Checks happen when the page opens, when it becomes visible again, when the
 * connection returns, and every half hour while open. Production builds only.
 * A patch (only the last number of the version changed) is quiet: the fix
 * arrives the next time Gospel Labs loads.
 */
export function UpdateNotice() {
  const [available, setAvailable] = useState<DeployedInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    let active = true;
    const check = async () => {
      if (!navigator.onLine) return;
      const deployed = await fetchDeployedInfo();
      if (active && deployed && isUpdateAvailable(deployed.version) && !isQuietUpdate(APP_RELEASE, deployed.release)) setAvailable(deployed);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void check();
    };
    void check();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("online", check);
    const timer = window.setInterval(check, CHECK_INTERVAL_MS);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("online", check);
      window.clearInterval(timer);
    };
  }, []);

  /** Saves everything, then reloads. Open forms are discarded only when the user says so. */
  const update = async (discardOpenForms = false) => {
    setBusy(true);
    setProblem(null);
    const drafts = unsavedDrafts();
    if (drafts.length > 0 && !discardOpenForms) {
      setProblem({ kind: "drafts", names: drafts });
      setBusy(false);
      return;
    }
    if (!(await saveAllWork())) {
      setProblem({ kind: "unsaved" });
      setBusy(false);
      return;
    }
    window.location.reload();
  };

  return (
    // Always present, so the notice is announced when it appears.
    <div role="status">
      {available && !dismissed && (
        <div className="border-b border-accent/30 bg-accent-soft px-4 py-2.5 sm:px-6 lg:px-10">
          <div className="mx-auto flex max-w-6xl flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <p className="flex items-start gap-2 text-sm text-fg">
                <RefreshCw aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
                <span>
                  <strong className="font-semibold">
                    {available.release ? `Gospel Labs ${available.release} is available` : "A new version of Gospel Labs is available"}
                    {available.title ? `: ${available.title}.` : "."}
                  </strong>{" "}
                  Updating saves your work, then reloads the page.
                </span>
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => void update()} disabled={busy}>
                  {busy ? "Saving…" : "Update now"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
                  Later
                </Button>
              </div>
            </div>
            {available.highlights && (
              <ul className="flex list-disc flex-col gap-0.5 pl-11 text-xs leading-relaxed text-muted marker:text-subtle">
                {available.highlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            )}
            {problem?.kind === "drafts" && (
              <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-fg">
                <p>
                  An unfinished form is open ({problem.names.join(", ")}). Save or cancel it first, or reload anyway and
                  lose what&rsquo;s in it.
                </p>
                <Button size="sm" variant="secondary" onClick={() => void update(true)} disabled={busy}>
                  Reload anyway
                </Button>
              </div>
            )}
            {problem?.kind === "unsaved" && (
              <p role="alert" className="text-xs text-fg">
                Some changes couldn&rsquo;t be saved, so the page wasn&rsquo;t reloaded. Resolve the message on the
                page, then try again.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
