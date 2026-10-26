"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Visually hide the title (it still names the sheet for screen readers). */
  hideTitle?: boolean;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** "bottom" slides up from the bottom edge (phones); "side" sits at the right edge. */
  side?: "bottom" | "side";
  className?: string;
}

/**
 * A panel that slides in from the bottom (or side) of the screen, on the
 * native <dialog> element: focus is contained, Escape closes it, focus
 * returns to the control that opened it, and tapping the backdrop closes it.
 * Mark the element to focus first with `data-autofocus`.
 */
export function Sheet({ open, onClose, title, hideTitle, description, children, footer, side = "bottom", className }: SheetProps) {
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
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // The panel fills the dialog, so a click on the dialog itself is a click on the backdrop.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        "max-h-[min(88dvh,44rem)] w-full max-w-none border border-line-strong bg-surface p-0 text-fg shadow-lifted",
        side === "bottom"
          ? "mx-auto mt-auto mb-0 rounded-t-3xl border-b-0 sm:mb-4 sm:max-w-lg sm:rounded-3xl sm:border-b"
          : "my-0 mr-0 ml-auto h-dvh max-h-dvh max-w-sm rounded-l-3xl border-r-0",
        className,
      )}
    >
      {open && (
        <div className="motion-reveal flex max-h-[inherit] flex-col">
          {side === "bottom" && <div aria-hidden className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line-strong sm:hidden" />}
          <header className={cn("flex items-start justify-between gap-4 px-5 pt-4 sm:px-6 sm:pt-5", hideTitle && "pt-2")}>
            <div className={cn(hideTitle && "sr-only")}>
              <h2 id={titleId} className="text-base font-semibold tracking-tight">
                {title}
              </h2>
              {description && (
                <div id={descriptionId} className="mt-1 text-sm leading-relaxed text-muted">
                  {description}
                </div>
              )}
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="-mr-2 ml-auto flex size-11 shrink-0 items-center justify-center rounded-full text-subtle transition-colors hover:bg-surface-raised hover:text-fg"
            >
              <X aria-hidden className="size-5" />
            </button>
          </header>
          <div className="min-h-0 overflow-y-auto overscroll-contain px-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-4">
            {children}
          </div>
          {footer && <footer className="border-t border-line px-5 py-4 sm:px-6">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
