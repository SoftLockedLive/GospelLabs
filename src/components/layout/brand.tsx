import Link from "next/link";
import { cn } from "@/lib/cn";

/** Gospel Labs tagline: "Search the scriptures" (John 5:39) and come to know Jesus Christ (John 17:3). */
export const TAGLINE = "Search the scriptures. Know Him.";

/**
 * The Gospel Labs mark (3.0): a sprout rising from an open book. Alma compares the word to a seed to be tried,
 * "an experiment upon my words" (Alma 32:27–28), which is what "Labs" means here. Drawn in the current text
 * color; the app icons in src/app and public/icons are the same drawing, white on ink.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn("size-7 shrink-0", className)} fill="currentColor">
      <path d="M32 51 C 32 41, 32.1 36, 33.1 31" fill="none" stroke="currentColor" strokeWidth="4.2" />
      <path d="M31.4 36.5 C 30.5 27, 23 21, 12.5 20.5 C 11.5 30, 19 38, 31.4 36.5 Z" />
      <path d="M31 31.6 C 31.2 19.5, 41 10.5, 53 9 C 55 21.5, 47 32.2, 35.2 31.6 Z" />
      <path d="M6 45.2 C 14.5 42.4, 25 43.5, 32 48.5 C 39 43.5, 49.5 42.4, 58 45.2 C 58.7 45.4, 59 46, 59 46.6 L 59 49.6 C 59 50.3, 58.4 50.7, 57.7 50.5 C 49.5 48.3, 39.5 49.2, 32 54.5 C 24.5 49.2, 14.5 48.3, 6.3 50.5 C 5.6 50.7, 5 50.3, 5 49.6 L 5 46.6 C 5 46, 5.3 45.4, 6 45.2 Z" />
    </svg>
  );
}

/** The mark and the name, set in Literata, the same serif as the scriptures in the app. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <BrandMark className="text-accent" />
      <span className="font-serif text-[1.1875rem] leading-none font-semibold tracking-[-0.01em] text-fg">Gospel Labs</span>
    </span>
  );
}

export function Brand({ className, showTagline = true }: { className?: string; showTagline?: boolean }) {
  // The link is named by its visible text (name and tagline), so speech-input users can say what they see (WCAG 2.5.3).
  return (
    <Link href="/" className={cn("flex min-h-11 flex-col justify-center gap-1 rounded-lg", className)}>
      <Wordmark />
      {showTagline && <span className="text-[13px] leading-tight text-subtle">{TAGLINE}</span>}
    </Link>
  );
}
