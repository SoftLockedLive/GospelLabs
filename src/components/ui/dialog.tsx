"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  /** Action buttons. Mark the safest one with `data-autofocus` to focus it on open. */
  footer: ReactNode;
  className?: string;
}

/**
 * Modal dialog on the native <dialog> element, which provides focus
 * containment, Escape to close, and focus restoration.
 */
export function Dialog({ open, onClose, title, description, children, footer, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      // Escape: let the parent decide, so open/closed state has a single owner.
      // (Listening to "close" instead would also fire for programmatic closes,
      // and a late event could close a dialog that had just been reopened.)
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className={cn(
        "m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-line-strong bg-surface p-0 text-fg shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm",
        className,
      )}
    >
      {open && (
        <div className="flex max-h-[85dvh] flex-col">
          <header className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
            <div>
              <h2 id={titleId} className="text-lg font-semibold tracking-tight">
                {title}
              </h2>
              {description && (
                <div id={descriptionId} className="mt-1.5 text-sm leading-relaxed text-muted">
                  {description}
                </div>
              )}
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="-mt-1 -mr-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-subtle hover:bg-surface-raised hover:text-fg"
            >
              <X aria-hidden className="size-4" />
            </button>
          </header>
          {children && <div className="overflow-y-auto px-5 pt-4 sm:px-6">{children}</div>}
          <footer className="flex flex-col-reverse gap-3 px-5 py-5 sm:flex-row sm:justify-end sm:px-6">{footer}</footer>
        </div>
      )}
    </dialog>
  );
}

/** A required "I understand" checkbox for irreversible actions. */
export function AcknowledgeCheckbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-3 text-sm text-fg">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-[var(--danger)]"
      />
      <span>{children}</span>
    </label>
  );
}
