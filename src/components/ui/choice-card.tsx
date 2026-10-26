import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

interface ChoiceCardProps {
  /** Shared by every card in the group. */
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  /** "radio" (one of several) or "checkbox" (independent). */
  type?: "radio" | "checkbox";
  /** Visible name of the choice; also its accessible name. */
  label: ReactNode;
  description?: ReactNode;
  /** Optional visual above the label (e.g. a theme preview). Hidden from assistive technology. */
  preview?: ReactNode;
  /** Optional icon or mark before the label. */
  leading?: ReactNode;
  className?: string;
}

/**
 * A selectable card on a native radio button or checkbox: the whole card is
 * the label, arrow keys move within a radio group, and the selected card has
 * an accent border and check mark (≥ 3:1 against the page in every theme).
 * Wrap a group in <fieldset> with a <legend>.
 */
export function ChoiceCard({
  name,
  value,
  checked,
  onChange,
  type = "radio",
  label,
  description,
  preview,
  leading,
  className,
}: ChoiceCardProps) {
  return (
    <label
      className={cn(
        "motion-press group relative flex min-h-11 cursor-pointer flex-col gap-3 rounded-xl border bg-surface p-3.5 text-left transition-colors",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
        checked ? "border-accent bg-accent-soft" : "border-line-strong hover:border-accent/50 hover:bg-surface-raised",
        className,
      )}
    >
      <input type={type} name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
      {preview && (
        <div aria-hidden className="pointer-events-none">
          {preview}
        </div>
      )}
      <span className="flex items-start gap-3">
        {leading && (
          <span aria-hidden className={cn("mt-0.5 shrink-0", checked ? "text-accent" : "text-subtle")}>
            {leading}
          </span>
        )}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-medium break-words text-fg">{label}</span>
          {description && <span className="text-xs leading-relaxed text-muted">{description}</span>}
        </span>
        {/* With a preview, the check sits on the preview's corner so the label keeps the full width. */}
        <CheckMark checked={checked} className={preview ? "absolute top-2 right-2 shadow-soft" : undefined} />
      </span>
    </label>
  );
}

function CheckMark({ checked, className }: { checked: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
        checked ? "border-accent bg-accent text-accent-fg" : "border-line-strong bg-surface text-transparent",
        className,
      )}
    >
      <Check className={cn("size-3", checked && "motion-success")} strokeWidth={3} />
    </span>
  );
}
