"use client";

import { Sunrise } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { formatForDay } from "@/domain/study/connect";
import { lastOpenedBySession, sessionForToday } from "@/domain/study/connect-helpers";
import { CONNECT_FORMAT_LABELS, type ConnectSession } from "@/domain/study/content-schema";
import { cn } from "@/lib/cn";
import { connectHref } from "@/lib/routes";
import { useExplorations } from "@/persistence/study-hooks";

interface ConnectTodayPreviewProps {
  sessions: Pick<ConnectSession, "id" | "format" | "title">[];
  className?: string;
}

/**
 * A small, quiet link to today's Connect with Christ session (for the
 * Dashboard): today's format and the session /connect will open. Shows no
 * counts or history.
 */
export function ConnectTodayPreview({ sessions, className }: ConnectTodayPreviewProps) {
  const explorations = useExplorations("connect");
  const [date] = useState(() => new Date());
  // Today's choice depends on this device's date and history, so it appears once those are read.
  const loaded = explorations.status !== "loading";
  const lastOpened = explorations.status === "ready" ? lastOpenedBySession(explorations.value) : undefined;
  const session = loaded ? sessionForToday(sessions, { date, lastOpened }) : undefined;
  const format = loaded ? formatForDay(date) : undefined;

  return (
    <Link
      href={connectHref()}
      className={cn(
        "motion-press group flex items-start gap-4 rounded-2xl border border-sacred-line bg-sacred p-5 text-sacred-fg transition-colors hover:border-sacred-accent/50",
        className,
      )}
    >
      <Sunrise aria-hidden className="mt-0.5 size-5 shrink-0 text-sacred-accent" />
      <span className="flex min-w-0 flex-col gap-1">
        <span className="scripture-caps text-sacred-accent">Connect with Christ</span>
        <span className="font-serif text-lg leading-snug text-balance">{session?.title ?? "Time with the Savior"}</span>
        <span className="text-sm text-sacred-muted">
          {format ? `Today: ${CONNECT_FORMAT_LABELS[format]} · ` : ""}A few quiet minutes
        </span>
      </span>
    </Link>
  );
}
