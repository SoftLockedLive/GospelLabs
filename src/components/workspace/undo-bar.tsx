"use client";

import { RotateCcw, X } from "lucide-react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";

interface UndoBarProps {
  label: string;
  onUndo: () => void;
  onDismiss: () => void;
}

/**
 * Shown after a deletion. Focus moves to Undo so keyboard users aren't left
 * on an element that no longer exists. Remount it (via key) per deletion.
 */
export function UndoBar({ label, onUndo, onDismiss }: UndoBarProps) {
  const focusOnMount = useCallback((element: HTMLButtonElement | null) => element?.focus(), []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 lg:bottom-6 lg:pl-64">
      <div
        role="status"
        className="pointer-events-auto flex items-center gap-2 rounded-xl border border-line-strong bg-surface-raised py-2 pr-2 pl-4 text-sm text-fg shadow-lg shadow-black/30"
      >
        <span className="mr-1">{label}</span>
        <Button ref={focusOnMount} variant="secondary" size="sm" onClick={onUndo}>
          <RotateCcw aria-hidden />
          Undo
        </Button>
        <Button variant="ghost" size="sm" className="size-8 px-0" aria-label="Dismiss" onClick={onDismiss}>
          <X aria-hidden />
        </Button>
      </div>
    </div>
  );
}
