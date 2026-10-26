import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/**
 * An on/off setting: a native checkbox with role="switch", so it is announced
 * as "on" or "off" and toggles with Space. The whole row is the touch target.
 */
export function Switch({ checked, onChange, label, description, disabled, className }: SwitchProps) {
  const id = useId();
  const descriptionId = description ? `${id}-description` : undefined;
  return (
    <div className={cn("flex min-h-11 items-start gap-4", className)}>
      <label htmlFor={id} className={cn("flex min-w-0 flex-1 flex-col gap-0.5 py-0.5", disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer")}>
        <span className="text-sm font-medium text-fg">{label}</span>
        {description && (
          <span id={descriptionId} className="text-xs leading-relaxed text-muted">
            {description}
          </span>
        )}
      </label>
      <span className="relative inline-flex shrink-0 items-center">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          aria-describedby={descriptionId}
          onChange={(event) => onChange(event.target.checked)}
          className="peer absolute inset-0 -m-2 size-[calc(100%+1rem)] cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
        <span
          aria-hidden
          className={cn(
            "pointer-events-none flex h-7 w-12 items-center rounded-full border p-0.5 transition-colors",
            "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
            checked ? "border-accent bg-accent" : "border-line-strong bg-surface-sunken",
          )}
        >
          <span
            className={cn(
              "size-5.5 rounded-full shadow-soft transition-transform duration-200",
              checked ? "translate-x-5 bg-accent-fg" : "translate-x-0 bg-subtle",
            )}
          />
        </span>
      </span>
    </div>
  );
}
