"use client";

import { BookOpen, Library, PenLine } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArtImage } from "@/components/ui/art-image";
import { buttonClasses } from "@/components/ui/button";
import { CONNECT_FORMAT_DESCRIPTIONS, CONNECT_FORMAT_LABELS, type ConnectSession } from "@/domain/study/content-schema";
import { formatForDay, pickConnectSession } from "@/domain/study/connect";
import { lastOpenedBySession } from "@/domain/study/connect-helpers";
import type { Exploration } from "@/domain/study/user-data";
import { cn } from "@/lib/cn";
import { characterHref, connectHref, explorerHref, newInvestigationHref } from "@/lib/routes";
import type { AttributeSummary, ConnectSessionSummary, PassageSummary } from "./types";

interface StudyToolsProps {
  passages: readonly PassageSummary[];
  attributes: readonly AttributeSummary[];
  connectSessions: readonly ConnectSessionSummary[];
  /** Connect with Christ explorations, for "least recently opened first". */
  connectExplorations: readonly Exploration[];
  now: Date | null;
}

/** Entry points to Connect with Christ, Scripture Explorer, and Character of Christ, each led by a painting. */
export function StudyTools({ passages, attributes, connectSessions, connectExplorations, now }: StudyToolsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
      <ConnectCard sessions={connectSessions} explorations={connectExplorations} now={now} />
      <ToolCard
        href={explorerHref()}
        art="explorer"
        title="Scripture Explorer"
        description="Read a passage closely: its setting, its key words and phrases, and what it teaches."
      >
        {passages.length > 0 && (
          <ul className="flex flex-col gap-1">
            {passages.slice(0, 3).map((passage) => (
              <li key={passage.id} className="flex min-w-0 items-baseline gap-2 text-sm">
                <span className="truncate font-serif text-fg">{passage.title}</span>
                <span className="shrink-0 text-[13px] text-muted">{passage.reference}</span>
              </li>
            ))}
          </ul>
        )}
      </ToolCard>
      <ToolCard
        href={characterHref()}
        art="character"
        title="Character of Christ"
        description="Study an attribute of the Savior, what it means, and how He showed it."
        className="md:col-span-2 xl:col-span-1"
      >
        {attributes.length > 0 && (
          <p className="font-serif text-sm leading-relaxed text-fg">{attributes.slice(0, 6).map((attribute) => attribute.name).join(" · ")}</p>
        )}
      </ToolCard>
    </div>
  );
}

interface ToolCardProps {
  href: string;
  /** The section's painting (src/content/art.json). */
  art: string;
  title: string;
  description: string;
  children?: ReactNode;
  className?: string;
}

/** A study tool: a row with a square of its painting on phones, a card with the painting across the top from `sm` up. */
function ToolCard({ href, art, title, description, children, className }: ToolCardProps) {
  return (
    <article
      className={cn(
        "group relative flex gap-4 rounded-xl transition-colors has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-accent sm:flex-col sm:gap-0 sm:overflow-hidden sm:border sm:border-line sm:bg-surface sm:hover:border-line-strong",
        className,
      )}
    >
      <ArtImage use={art} ratio="square" decorative sizes="(min-width: 40rem) 24rem, 6rem" className="size-24 shrink-0 rounded-lg sm:aspect-video sm:h-auto sm:w-full sm:rounded-none" />
      <div className="flex min-w-0 flex-1 flex-col sm:p-5">
        <h3 className="text-[1.0625rem] font-bold text-fg sm:font-serif sm:text-xl sm:font-medium">
          <Link href={href} className="outline-none after:absolute after:inset-0 after:rounded-xl group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
            {title}
          </Link>
        </h3>
        <p className="mt-1 text-[0.9375rem] leading-relaxed text-muted">{description}</p>
        {children && <div className="mt-4 hidden border-t border-line pt-4 sm:block">{children}</div>}
      </div>
    </article>
  );
}

/**
 * Today's Connect with Christ invitation. Formats rotate by day, and within a
 * format the session opened least recently comes first. The date is only
 * known in the browser, so the session appears once the page is running.
 */
function ConnectCard({
  sessions,
  explorations,
  now,
}: {
  sessions: readonly ConnectSessionSummary[];
  explorations: readonly Exploration[];
  now: Date | null;
}) {
  const format = now ? formatForDay(now) : null;
  const lastOpened = lastOpenedBySession(explorations);
  // pickConnectSession reads only each session's id and format.
  const picked = now ? pickConnectSession(sessions as readonly ConnectSession[], { date: now, lastOpened }) : undefined;
  const session = picked && sessions.find((candidate) => candidate.id === picked.id);

  return (
    <article className="group relative flex gap-4 overflow-hidden rounded-xl border border-sacred-line bg-sacred p-3 text-sacred-fg transition-colors has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-accent hover:border-sacred-accent/50 sm:flex-col sm:gap-0 sm:p-0">
      <ArtImage use="connect" ratio="square" decorative sizes="(min-width: 40rem) 24rem, 6rem" className="size-24 shrink-0 rounded-lg sm:aspect-video sm:h-auto sm:w-full sm:rounded-none" />
      <div className="flex min-w-0 flex-1 flex-col sm:p-5">
        <h3 className="text-[1.0625rem] font-bold sm:font-serif sm:text-xl sm:font-medium">
          <Link href={connectHref()} className="outline-none after:absolute after:inset-0 after:z-10 after:rounded-xl group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
            Connect with Christ
          </Link>
        </h3>
        <p className="mt-1 text-[0.9375rem] leading-relaxed text-sacred-muted">A few quiet minutes with the Savior. Nothing to finish, nothing scored.</p>
        <div className="mt-3 border-t border-sacred-line pt-3 sm:mt-4 sm:pt-4" aria-live="polite">
          {format ? (
            <div className="motion-reveal">
              <p className="scripture-caps text-sacred-accent">Today · {CONNECT_FORMAT_LABELS[format]}</p>
              <p className="mt-1 font-serif text-[0.9375rem] leading-relaxed">{session ? session.title : CONNECT_FORMAT_DESCRIPTIONS[format]}</p>
            </div>
          ) : (
            <div aria-hidden className="flex flex-col gap-2">
              <div className="h-3 w-28 animate-pulse rounded-lg bg-sacred-line" />
              <div className="h-4 w-3/4 animate-pulse rounded-lg bg-sacred-line" />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

/** The 1.x research notebook, kept as Research: ask your own question and gather evidence. */
export function ResearchCard() {
  return (
    <section aria-labelledby="research-heading" className="flex flex-col gap-4 border-t border-line pt-8 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <h2 id="research-heading" className="text-heading text-fg">
          Research a question of your own
        </h2>
        <p className="mt-1 max-w-xl text-[0.9375rem] leading-relaxed text-muted">
          The research notebook walks you from question to hypothesis, evidence, analysis, and your own conclusion.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link href={newInvestigationHref()} className={buttonClasses({ variant: "secondary" })}>
          <PenLine aria-hidden />
          New research notebook
        </Link>
        <Link href="/questions" className={buttonClasses({ variant: "link" })}>
          <BookOpen aria-hidden />
          Question Bank
        </Link>
        <Link href="/library" className={buttonClasses({ variant: "link" })}>
          <Library aria-hidden />
          My Library
        </Link>
      </div>
    </section>
  );
}
