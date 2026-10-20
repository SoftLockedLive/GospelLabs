/**
 * Translates IndexedDB/Dexie failures into a small set of kinds with
 * messages a user can act on.
 */

export type StorageErrorKind = "unavailable" | "quota" | "version" | "invalid-data" | "unknown";

const MESSAGES: Record<StorageErrorKind, string> = {
  unavailable:
    "This browser isn't letting Gospel Labs store data. Private browsing or blocked site storage can cause this.",
  quota: "Your device is out of storage space for Gospel Labs. Free up space, then try again.",
  version:
    "Your saved data was created by a newer version of Gospel Labs. Reload the page to get the latest version.",
  "invalid-data": "This data didn't pass validation, so it wasn't saved.",
  unknown: "Something went wrong while accessing saved data. Try again.",
};

export class StorageError extends Error {
  readonly kind: StorageErrorKind;

  constructor(kind: StorageErrorKind, options?: { cause?: unknown; message?: string }) {
    super(options?.message ?? MESSAGES[kind], { cause: options?.cause });
    this.name = "StorageError";
    this.kind = kind;
  }
}

const UNAVAILABLE_NAMES = new Set([
  "MissingAPIError",
  "OpenFailedError",
  "DatabaseClosedError",
  "InvalidStateError",
  "SecurityError",
  "UnknownError",
]);

/** Error names along Dexie's `inner` chain, outermost first. */
function errorNames(error: unknown): string[] {
  const names: string[] = [];
  let current: unknown = error;
  for (let depth = 0; current && typeof current === "object" && depth < 5; depth++) {
    const { name, inner } = current as { name?: unknown; inner?: unknown };
    if (typeof name === "string") names.push(name);
    current = inner;
  }
  return names;
}

export function toStorageError(error: unknown): StorageError {
  if (error instanceof StorageError) return error;
  const names = errorNames(error);
  if (names.includes("QuotaExceededError")) return new StorageError("quota", { cause: error });
  if (names.includes("VersionError")) return new StorageError("version", { cause: error });
  if (names.some((name) => UNAVAILABLE_NAMES.has(name))) return new StorageError("unavailable", { cause: error });
  return new StorageError("unknown", { cause: error });
}
