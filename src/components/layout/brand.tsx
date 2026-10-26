import Link from "next/link";
import { cn } from "@/lib/cn";

/** Gospel Labs 2.0 tagline: "Search the scriptures" (John 5:39) and come to know Jesus Christ (John 17:3). */
export const TAGLINE = "Search the scriptures. Know Him.";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <rect width="32" height="32" rx="9" className="fill-accent-soft" />
      <rect x="0.5" y="0.5" width="31" height="31" rx="8.5" fill="none" className="stroke-accent/35" />
      {/* Flask outline with a small light at its center. */}
      <path
        d="M13 8h6M14 8v6.2L9.4 22a2 2 0 0 0 1.7 3h9.8a2 2 0 0 0 1.7-3L18 14.2V8"
        fill="none"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-accent"
      />
      <circle cx="16" cy="20.5" r="1.8" className="fill-accent" />
    </svg>
  );
}

export function Brand({ className, showTagline = true }: { className?: string; showTagline?: boolean }) {
  // The link is named by its visible text (name and tagline), so speech-input users can say what they see (WCAG 2.5.3).
  return (
    <Link href="/" className={cn("flex min-h-11 items-center gap-3 rounded-lg", className)}>
      <BrandMark />
      <span className="flex flex-col leading-tight">
        <span className="text-[15px] font-semibold tracking-tight text-fg">Gospel Labs</span>
        {showTagline && <span className="font-serif text-[11px] text-subtle italic">{TAGLINE}</span>}
      </span>
    </Link>
  );
}
