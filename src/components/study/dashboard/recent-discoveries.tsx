import { NotebookPen, PenLine, Waypoints } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ArtImage } from "@/components/ui/art-image";
import { buttonClasses } from "@/components/ui/button";
import type { DiscoveryCard, DiscoveryOrigin } from "@/domain/study/user-data";
import { cn } from "@/lib/cn";
import { investigateHref, journalHref, mapHref, notebookHref } from "@/lib/routes";
import { relativeDay } from "./time";

const ORIGIN_LABELS: Record<DiscoveryOrigin, string> = {
  investigation: "Investigation",
  passage: "Scripture Explorer",
  attribute: "Character of Christ",
  connect: "Connect with Christ",
};

/** The painting a card shows: its investigation's, or its study tool's. */
const artForCard = (card: DiscoveryCard) =>
  card.origin.kind === "investigation"
    ? card.origin.contentId
    : ({ passage: "explorer", attribute: "character", connect: "connect" } as const)[card.origin.kind];

/** How many recent cards the dashboard shows. */
export const RECENT_DISCOVERIES = 3;

/** The latest Discovery Cards, with ways into the Notebook and the Map. */
export function RecentDiscoveries({ cards, total, now }: { cards: readonly DiscoveryCard[]; total: number; now: Date | null }) {
  if (total === 0) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-xl bg-surface-sunken p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="font-serif text-lg text-fg">Your discoveries will gather here</p>
          <p className="mt-1 max-w-lg text-[0.9375rem] leading-relaxed text-muted">
            Finish an investigation and Gospel Labs saves a Discovery Card of what you found, with its sources. Your
            cards also grow your Map.
          </p>
        </div>
        <Link href={investigateHref()} className={cn(buttonClasses({ variant: "secondary" }), "w-full sm:w-auto")}>
          Browse investigations
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <ul className="flex flex-col divide-y divide-line border-y border-line">
        {cards.map((card, index) => (
          <li key={card.id} className="motion-reveal" style={{ "--motion-index": index } as CSSProperties}>
            <article className="group relative flex items-start gap-4 rounded-lg py-3 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-accent">
              <ArtImage use={artForCard(card)} ratio="square" decorative sizes="4rem" className="size-16 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-muted">{ORIGIN_LABELS[card.origin.kind]}</p>
                <h3 className="mt-0.5 text-[1.0625rem] leading-snug font-bold text-fg">
                  <Link href={notebookHref(card.id)} className="outline-none after:absolute after:inset-0 after:rounded-lg group-hover:underline group-hover:underline-offset-4">
                    {card.title}
                  </Link>
                </h3>
                {card.question && <p className="mt-0.5 line-clamp-2 font-serif text-[0.9375rem] leading-relaxed text-muted italic">{card.question}</p>}
                {now && <p className="mt-1 text-[13px] text-muted">Saved {relativeDay(card.createdAt, now)}</p>}
              </div>
            </article>
          </li>
        ))}
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
        <Link href={journalHref()} className={buttonClasses({ variant: "link" })}>
          <PenLine aria-hidden />
          Your journal
        </Link>
      </div>
    </div>
  );
}
