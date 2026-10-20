"use client";

import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

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
            <Button variant="secondary" size="sm" onClick={requestPersistence}>
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
