import { BookOpenText, Compass, HeartHandshake, NotebookPen, Sparkles, Waypoints, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { buttonClasses } from "@/components/ui/button";
import type { DiscoveryCard, DiscoveryOrigin } from "@/domain/study/user-data";
import { cn } from "@/lib/cn";
import { investigateHref, mapHref, notebookHref } from "@/lib/routes";
import { relativeDay } from "./time";

const ORIGINS: Record<DiscoveryOrigin, { label: string; icon: LucideIcon; tone: string }> = {
  investigation: { label: "Investigation", icon: Compass, tone: "text-node-investigation" },
  passage: { label: "Scripture Explorer", icon: BookOpenText, tone: "text-node-scripture" },
  attribute: { label: "Character of Christ", icon: Sparkles, tone: "text-node-attribute" },
  connect: { label: "Connect with Christ", icon: HeartHandshake, tone: "text-sacred-accent" },
};

/** How many recent cards the dashboard shows. */
export const RECENT_DISCOVERIES = 3;

/** The latest Discovery Cards, with ways into the Notebook and the Map. */
export function RecentDiscoveries({ cards, total, now }: { cards: readonly DiscoveryCard[]; total: number; now: Date | null }) {
  if (total === 0) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-line-strong p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-4">
          <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-green-soft text-green">
            <NotebookPen className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-fg">Your discoveries will gather here</p>
            <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted">
              Finish an investigation and Gospel Labs saves a Discovery Card of what you found, with its sources. Your
              cards also grow your Map.
            </p>
          </div>
        </div>
        <Link href={investigateHref()} className={cn(buttonClasses({ variant: "secondary" }), "w-full sm:w-auto")}>
          Browse investigations
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card, index) => {
          const origin = ORIGINS[card.origin.kind];
          const Icon = origin.icon;
          return (
            <li key={card.id} className="motion-reveal" style={{ "--motion-index": index } as CSSProperties}>
              <article className="group relative flex h-full flex-col rounded-2xl border border-line bg-surface p-4 shadow-soft transition-colors has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-accent hover:border-accent/40 hover:bg-surface-raised sm:p-5">
                <p className={cn("flex items-center gap-1.5 text-xs font-medium", origin.tone)}>
                  <Icon aria-hidden className="size-3.5" />
                  {origin.label}
                </p>
                <h3 className="mt-2 text-[15px] leading-snug font-semibold text-fg">
                  <Link href={notebookHref(card.id)} className="outline-none after:absolute after:inset-0 after:rounded-2xl">
                    {card.title}
                  </Link>
                </h3>
                {card.question && <p className="mt-1.5 line-clamp-2 font-serif text-sm leading-relaxed text-muted italic">{card.question}</p>}
                {now && <p className="mt-auto pt-3 text-xs text-subtle">Saved {relativeDay(card.createdAt, now)}</p>}
              </article>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link href={notebookHref()} className={buttonClasses({ variant: "secondary" })}>
          <NotebookPen aria-hidden />
          Open your Notebook
        </Link>
        <Link href={mapHref()} className={buttonClasses({ variant: "secondary" })}>
          <Waypoints aria-hidden />
          Open your Map
        </Link>
      </div>
    </div>
  );
}
