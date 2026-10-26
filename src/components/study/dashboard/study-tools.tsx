"use client";

import { ArrowUpRight, BookOpen, BookOpenText, FlaskConical, HeartHandshake, Library, PenLine, Sparkles, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
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

/** Entry points to Scripture Explorer, Character of Christ, and Connect with Christ. */
export function StudyTools({ passages, attributes, connectSessions, connectExplorations, now }: StudyToolsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <ConnectCard sessions={connectSessions} explorations={connectExplorations} now={now} />
      <ToolCard
        href={explorerHref()}
        icon={BookOpenText}
        iconClass="text-node-scripture bg-node-scripture/12"
        title="Scripture Explorer"
        description="Read a passage closely: its setting, its key words and phrases, and what it teaches."
      >
        {passages.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {passages.slice(0, 3).map((passage) => (
              <li key={passage.id} className="flex min-w-0 items-baseline gap-2 text-sm">
                <span className="truncate font-serif text-fg">{passage.title}</span>
                <span className="shrink-0 text-xs text-subtle">{passage.reference}</span>
              </li>
            ))}
          </ul>
        )}
      </ToolCard>
      <ToolCard
        href={characterHref()}
        icon={Sparkles}
        iconClass="text-node-attribute bg-node-attribute/12"
        title="Character of Christ"
        description="Study an attribute of the Savior, what it means, and how He showed it."
        className="md:col-span-2 xl:col-span-1"
      >
        {attributes.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {attributes.slice(0, 6).map((attribute) => (
              <li key={attribute.id} className="rounded-full border border-line bg-surface-sunken px-2.5 py-0.5 text-xs text-muted">
                {attribute.name}
              </li>
            ))}
          </ul>
        )}
      </ToolCard>
    </div>
  );
}

interface ToolCardProps {
  href: string;
  icon: LucideIcon;
  iconClass: string;
  title: string;
  description: string;
  children?: ReactNode;
  className?: string;
}

function ToolCard({ href, icon: Icon, iconClass, title, description, children, className }: ToolCardProps) {
  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-soft transition-colors has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-accent hover:border-accent/40 hover:bg-surface-raised",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span aria-hidden className={cn("flex size-10 items-center justify-center rounded-xl", iconClass)}>
          <Icon className="size-5" />
        </span>
        <ArrowUpRight aria-hidden className="size-4 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
      </div>
      <h3 className="mt-4 text-base font-semibold tracking-tight text-fg">
        <Link href={href} className="outline-none after:absolute after:inset-0 after:rounded-2xl">
          {title}
        </Link>
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{description}</p>
      {children && <div className="mt-4 border-t border-line pt-4">{children}</div>}
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
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-sacred-line bg-sacred p-5 text-sacred-fg shadow-soft transition-shadow has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-accent hover:shadow-lifted">
      <div aria-hidden className="pointer-events-none absolute -top-16 -right-10 size-44 rounded-full bg-sacred-accent/10 blur-3xl" />
      <div className="relative flex items-start justify-between gap-3">
        <span aria-hidden className="flex size-10 items-center justify-center rounded-xl bg-sacred-accent/15 text-sacred-accent">
          <HeartHandshake className="size-5" />
        </span>
        <ArrowUpRight aria-hidden className="size-4 text-sacred-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-sacred-accent" />
      </div>
      {/* Not `relative`: the link's ::after must be positioned against the whole card (like ToolCard's), and
          z-10 keeps it above the description and today's session, which are `relative` to sit above the glow. */}
      <h3 className="mt-4 text-base font-semibold tracking-tight">
        <Link href={connectHref()} className="outline-none after:absolute after:inset-0 after:z-10 after:rounded-2xl">
          Connect with Christ
        </Link>
      </h3>
      <p className="relative mt-1.5 text-sm leading-relaxed text-sacred-muted">
        A quiet few minutes with the Savior. Nothing to finish, nothing scored.
      </p>
      <div className="relative mt-4 border-t border-sacred-line pt-4" aria-live="polite">
        {format ? (
          <div className="motion-reveal">
            <p className="text-xs font-semibold tracking-wide text-sacred-accent uppercase">Today · {CONNECT_FORMAT_LABELS[format]}</p>
            <p className="mt-1.5 font-serif text-[15px] leading-relaxed">{session ? session.title : CONNECT_FORMAT_DESCRIPTIONS[format]}</p>
          </div>
        ) : (
          <div aria-hidden className="flex flex-col gap-2">
            <div className="h-3 w-28 animate-pulse rounded-lg bg-sacred-line" />
            <div className="h-4 w-3/4 animate-pulse rounded-lg bg-sacred-line" />
          </div>
        )}
      </div>
    </article>
  );
}

/** The 1.x research notebook, kept as Research: ask your own question and gather evidence. */
export function ResearchCard() {
  return (
    <section
      aria-labelledby="research-heading"
      className="flex flex-col gap-5 rounded-2xl border border-dashed border-line-strong p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="flex min-w-0 items-start gap-4">
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-muted">
          <FlaskConical className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 id="research-heading" className="text-base font-semibold tracking-tight text-fg">
            Research a question of your own
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
            The research notebook walks you from question to hypothesis, evidence, analysis, and your own conclusion.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link href={newInvestigationHref()} className={buttonClasses({ variant: "secondary" })}>
          <PenLine aria-hidden />
          New research notebook
        </Link>
        <Link href="/questions" className={buttonClasses({ variant: "ghost" })}>
          <BookOpen aria-hidden />
          Question Bank
        </Link>
        <Link href="/library" className={buttonClasses({ variant: "ghost" })}>
          <Library aria-hidden />
          My Library
        </Link>
      </div>
    </section>
  );
}
