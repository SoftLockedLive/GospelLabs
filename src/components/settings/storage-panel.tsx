"use client";

import { ShieldCheck } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { DATA_KINDS, DATA_KIND_LABELS, type DataCounts } from "@/persistence/backup";

interface StorageInfo {
  usage?: number;
  persisted: boolean;
  canPersist: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function readStorageInfo(): Promise<StorageInfo | null> {
  const storage = typeof navigator !== "undefined" ? navigator.storage : undefined;
  if (!storage?.estimate) return null;
  const [estimate, persisted] = await Promise.all([storage.estimate(), storage.persisted?.() ?? false]);
  return { usage: estimate.usage, persisted, canPersist: typeof storage.persist === "function" };
}

/**
 * How many records of each kind are saved on this device: research
 * investigations and every kind of study data. Counts include damaged
 * records, since deleting everything removes them too.
 */
export function SavedDataSummary({ counts }: { counts: DataCounts }) {
  const headingId = useId();
  return (
    <div>
      <p id={headingId} className="text-sm font-medium text-fg">
        Saved on this device
      </p>
      <ul aria-labelledby={headingId} className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-muted sm:grid-cols-2">
        {DATA_KINDS.map((kind) => (
          <li key={kind}>
            <span className="font-semibold tabular-nums text-fg">{counts[kind]}</span>{" "}
            {counts[kind] === 1 ? DATA_KIND_LABELS[kind].one : DATA_KIND_LABELS[kind].many}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Shows how much space is used and lets the user ask the browser not to
 * clear Gospel Labs data automatically when the device runs low on space.
 */
export function StoragePanel() {
  const [info, setInfo] = useState<StorageInfo | null>(null);
  const [requestDenied, setRequestDenied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    readStorageInfo().then(
      (value) => !cancelled && setInfo(value),
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, []);

  if (!info) return null;

  const requestPersistence = async () => {
    const granted = await navigator.storage.persist();
    setRequestDenied(!granted);
    setInfo(await readStorageInfo());
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface-sunken/50 px-4 py-3.5 text-sm">
      {info.usage !== undefined && (
        <p className="text-muted">
          Using about <span className="text-fg">{formatBytes(info.usage)}</span> on this device.
        </p>
      )}
      {info.persisted ? (
        <p className="flex items-center gap-2 text-muted">
          <ShieldCheck aria-hidden className="size-4 text-green" />
          Protected: the browser won&rsquo;t clear this data automatically.
        </p>
      ) : (
        info.canPersist && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-muted">
              When a device runs low on space, browsers may clear site data. You can ask this browser to keep
              Gospel Labs data.
            </p>
            <Button variant="secondary" size="md" onClick={requestPersistence}>
              <ShieldCheck aria-hidden />
              Keep my data protected
            </Button>
            {requestDenied && (
              <p role="status" className="text-xs text-subtle">
                The browser declined for now. Browsers often grant this to sites you use regularly or install.
                Regular backups are the safest protection.
              </p>
            )}
          </div>
        )
      )}
    </div>
  );
}
