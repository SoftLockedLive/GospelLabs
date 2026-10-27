import { DatabaseZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { StorageError } from "@/persistence/storage-errors";

interface StorageErrorStateProps {
  error: StorageError;
  onRetry?: () => void;
  /** 1 when this message is the whole page. */
  headingLevel?: 1 | 2;
}

/** Full-area message for when saved data can't be read at all. */
export function StorageErrorState({ error, onRetry, headingLevel = 2 }: StorageErrorStateProps) {
  return (
    <div role="alert">
      <EmptyState
        headingLevel={headingLevel}
        icon={DatabaseZap}
        title="Saved data couldn’t be loaded"
        description={error.message}
        action={
          onRetry && (
            <Button variant="secondary" onClick={onRetry}>
              Try again
            </Button>
          )
        }
        className="mt-6 bg-surface"
      />
    </div>
  );
}
