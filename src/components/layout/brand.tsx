import Link from "next/link";
import { cn } from "@/lib/cn";

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

export function Brand({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-3 rounded-lg", className)}>
      <BrandMark />
      <span className="flex flex-col leading-tight">
        <span className="text-[15px] font-semibold tracking-tight text-fg">Gospel Labs</span>
        <span className="font-mono text-[10px] tracking-[0.06em] whitespace-nowrap text-subtle uppercase">Question · Study · Discover</span>
      </span>
    </Link>
  );
}
