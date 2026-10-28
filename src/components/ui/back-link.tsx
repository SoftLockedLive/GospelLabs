import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** The way back to the page above, at the top of a page: "‹ Character of Christ". Named by where it goes. */
export function BackLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn("-ml-2.5 inline-flex min-h-11 w-fit items-center gap-1 rounded-lg px-2.5 text-base font-semibold text-accent hover:bg-accent-soft", className)}
    >
      <ChevronLeft aria-hidden className="size-5" />
      {children}
    </Link>
  );
}
