"use client";

/**
 * Matching two lists (claims with evidence, terms with meanings). Nothing is
 * drag-only:
 *
 *   - From the sm breakpoint up: two columns. Select an item on either side,
 *     then its partner on the other; lines are drawn between connected pairs.
 *     Selecting a connected pair again disconnects it. Escape cancels.
 *   - On phones: each left item has its own list of choices, opened in place,
 *     so there's no scrolling back and forth between long lists.
 *
 * Both layouts edit the same value; only one is displayed at a time.
 */
import { ChevronDown, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { ItemMark } from "@/domain/study/activities";
import { cn } from "@/lib/cn";
import type { FinishedAs } from "./activity-state";
import { ItemFeedbackText, MarkIcon, markSurface } from "./marks";

export interface MatchItem {
  id: string;
  text: string;
  /** Secondary line, e.g. the source of an example. */
  detail?: ReactNode;
}

interface MatchBoardProps {
  leftLabel: string;
  rightLabel: string;
  left: readonly MatchItem[];
  right: readonly MatchItem[];
  /** Left id → right id. */
  value: Readonly<Record<string, string>>;
  /** Connect a pair, or disconnect it if it was connected. */
  onToggle: (leftId: string, rightId: string) => void;
  markFor: (leftId: string) => ItemMark | undefined;
  feedbackFor: (leftId: string) => string | undefined;
  /** Shown under each left item once finished, e.g. why the pair belongs together. */
  explainFor?: (leftId: string) => ReactNode;
  finished: FinishedAs;
  /** Right items may be used by only one left item each (used ones are moved, not shared). */
  exclusive?: boolean;
  /** Serif text for right items (scripture). */
  serifRight?: boolean;
}

const itemBase =
  "relative flex min-h-12 w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left text-sm leading-relaxed text-fg transition-colors";

function NumberBadge({ n, active }: { n: number; active?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full border font-semibold tabular-nums text-[11px]",
        active ? "border-accent bg-accent text-accent-fg" : "border-accent/50 text-accent",
      )}
    >
      {n}
    </span>
  );
}

export function MatchBoard(props: MatchBoardProps) {
  return (
    <>
      <div className="hidden sm:block">
        <MatchColumns {...props} />
      </div>
      <div className="sm:hidden">
        <MatchStack {...props} />
      </div>
    </>
  );
}

// --- Wide screens: columns with lines -------------------------------------------------

interface Line {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  mark?: ItemMark;
}

function MatchColumns({ leftLabel, rightLabel, left, right, value, onToggle, markFor, feedbackFor, explainFor, finished, serifRight }: MatchBoardProps) {
  const [selected, setSelected] = useState<{ side: "left" | "right"; id: string } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);
  const readOnly = !!finished;
  const numberOf = new Map(left.map((item, index) => [item.id, index + 1]));
  const textOf = (side: "left" | "right", id: string) => (side === "left" ? left : right).find((item) => item.id === id)?.text ?? "";
  const marks = new Map(left.map((item) => [item.id, markFor(item.id)]));
  const markKey = left.map((item) => `${item.id}=${marks.get(item.id) ?? ""}`).join(",");

  // Lines follow the items as the layout changes (wrapping text, resizing, new pairs).
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const measure = () => {
      const box = board.getBoundingClientRect();
      const next: Line[] = [];
      for (const [leftId, rightId] of Object.entries(value)) {
        const from = board.querySelector(`[data-match-left="${CSS.escape(leftId)}"]`)?.getBoundingClientRect();
        const to = board.querySelector(`[data-match-right="${CSS.escape(rightId)}"]`)?.getBoundingClientRect();
        if (!from || !to || box.width === 0) continue;
        next.push({
          key: `${leftId}->${rightId}`,
          x1: from.right - box.left,
          y1: from.top + from.height / 2 - box.top,
          x2: to.left - box.left,
          y2: to.top + to.height / 2 - box.top,
          mark: marks.get(leftId),
        });
      }
      setLines(next);
    };
    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(() => measure());
    observer.observe(board);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
    // `marks` is derived from markKey; value identity changes with every edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, markKey]);

  function choose(side: "left" | "right", id: string) {
    if (readOnly) return;
    if (!selected || selected.side === side) {
      const same = selected?.side === side && selected.id === id;
      setSelected(same ? null : { side, id });
      setAnnouncement(same ? "Selection cleared." : `Selected “${textOf(side, id)}”. Now choose from ${side === "left" ? rightLabel : leftLabel}.`);
      return;
    }
    const leftId = side === "left" ? id : selected.id;
    const rightId = side === "right" ? id : selected.id;
    const wasConnected = value[leftId] === rightId;
    onToggle(leftId, rightId);
    setSelected(null);
    setAnnouncement(wasConnected ? `Disconnected “${textOf("left", leftId)}”.` : `Connected “${textOf("left", leftId)}” with “${textOf("right", rightId)}”.`);
  }

  const connectedTo = (rightId: string) => left.filter((item) => value[item.id] === rightId).map((item) => numberOf.get(item.id)!);

  return (
    <div
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !selected) return;
        setSelected(null);
        setAnnouncement("Selection cleared.");
      }}
    >
      {!readOnly && (
        <p className="mb-4 text-sm text-muted">
          Select an item on one side, then its match on the other. Select a connected pair again to disconnect it.
        </p>
      )}
      <div ref={boardRef} className="relative grid grid-cols-[minmax(0,1fr)_3.5rem_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_5rem_minmax(0,1fr)]">
        <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible">
          {lines.map((line) => {
            const dx = (line.x2 - line.x1) / 2;
            const tone = line.mark === "incorrect" ? "danger" : line.mark === "correct" ? (finished === "revealed" ? "accent" : "green") : "accent";
            const stroke = { danger: "stroke-danger", accent: "stroke-accent", green: "stroke-green" }[tone];
            const fill = { danger: "fill-danger", accent: "fill-accent", green: "fill-green" }[tone];
            return (
              <g key={line.key}>
                <path
                  d={`M ${line.x1} ${line.y1} C ${line.x1 + dx} ${line.y1}, ${line.x2 - dx} ${line.y2}, ${line.x2} ${line.y2}`}
                  pathLength={1}
                  className={cn("motion-draw fill-none", stroke, line.mark === "incorrect" ? "opacity-80" : "opacity-70")}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                <circle cx={line.x1} cy={line.y1} r={3.5} className={fill} />
                <circle cx={line.x2} cy={line.y2} r={3.5} className={fill} />
              </g>
            );
          })}
        </svg>

        <div role="group" aria-label={leftLabel} className="flex flex-col gap-2.5">
          <p className="mb-1 kicker text-muted">{leftLabel}</p>
          {left.map((item) => {
            const mark = marks.get(item.id);
            const isSelected = selected?.side === "left" && selected.id === item.id;
            const partner = value[item.id];
            const feedback = feedbackFor(item.id);
            return (
              <div key={item.id}>
                <button
                  type="button"
                  data-match-left={item.id}
                  aria-pressed={isSelected}
                  aria-disabled={readOnly || undefined}
                  onClick={() => choose("left", item.id)}
                  className={cn(
                    itemBase,
                    isSelected ? "border-accent bg-accent-soft ring-2 ring-accent/35" : partner ? "border-accent/35 bg-surface" : "border-line bg-surface hover:border-line-strong hover:bg-surface-raised",
                    markSurface(mark, finished),
                    readOnly && "cursor-default",
                  )}
                >
                  <NumberBadge n={numberOf.get(item.id)!} active={isSelected} />
                  <span className="min-w-0 flex-1">
                    {item.text}
                    {item.detail && <span className="mt-1 block text-xs text-muted">{item.detail}</span>}
                    {partner && <span className="sr-only"> (connected with: {textOf("right", partner)})</span>}
                  </span>
                  <MarkIcon mark={mark} finished={finished} className="mt-0.5" />
                </button>
                <ItemFeedbackText message={feedback} />
                {finished && explainFor?.(item.id)}
              </div>
            );
          })}
        </div>

        <div aria-hidden />

        <div role="group" aria-label={rightLabel} className="flex flex-col gap-2.5">
          <p className="mb-1 kicker text-muted">{rightLabel}</p>
          {right.map((item) => {
            const isSelected = selected?.side === "right" && selected.id === item.id;
            const numbers = connectedTo(item.id);
            return (
              <button
                key={item.id}
                type="button"
                data-match-right={item.id}
                aria-pressed={isSelected}
                aria-disabled={readOnly || undefined}
                onClick={() => choose("right", item.id)}
                className={cn(
                  itemBase,
                  isSelected ? "border-accent bg-accent-soft ring-2 ring-accent/35" : numbers.length ? "border-accent/35 bg-surface" : "border-line bg-surface hover:border-line-strong hover:bg-surface-raised",
                  selected?.side === "left" && !isSelected && "border-dashed",
                  readOnly && "cursor-default",
                )}
              >
                <span className={cn("min-w-0 flex-1", serifRight && "font-serif text-[0.975rem]")}>
                  {item.text}
                  {item.detail && <span className="mt-1 block font-sans text-xs text-muted">{item.detail}</span>}
                </span>
                {numbers.length > 0 && (
                  <span className="flex shrink-0 gap-1">
                    {numbers.map((n) => (
                      <NumberBadge key={n} n={n} />
                    ))}
                    <span className="sr-only">Connected with {numbers.length === 1 ? "item" : "items"} {numbers.join(", ")}</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

// --- Phones: a choice list under each item -----------------------------------------------

function MatchStack({ rightLabel, left, right, value, onToggle, markFor, feedbackFor, explainFor, finished, exclusive, serifRight }: MatchBoardProps) {
  const [open, setOpen] = useState<string | null>(null);
  const baseId = useId();
  const readOnly = !!finished;
  const textOf = (id: string) => right.find((item) => item.id === id)?.text ?? "";
  const usedBy = (rightId: string) => left.find((item) => value[item.id] === rightId)?.id;

  return (
    <ol className="flex flex-col gap-3">
      {left.map((item, index) => {
        const mark = markFor(item.id);
        const partner = value[item.id];
        const listId = `${baseId}-${item.id}`;
        const isOpen = open === item.id && !readOnly;
        return (
          <li key={item.id} className={cn("rounded-xl border bg-surface p-3.5", mark ? markSurface(mark, finished) : "border-line")}>
            <div className="flex items-start gap-3">
              <NumberBadge n={index + 1} />
              <p className="min-w-0 flex-1 text-sm leading-relaxed text-fg">{item.text}</p>
              <MarkIcon mark={mark} finished={finished} className="mt-0.5" />
            </div>
            {item.detail && <p className="mt-1 pl-9 text-xs text-muted">{item.detail}</p>}

            {partner ? (
              <p className={cn("mt-3 rounded-lg border border-accent/30 bg-accent-soft px-3 py-2 text-sm text-fg", serifRight && "font-serif")}>
                <span className="sr-only">Matched with: </span>
                {textOf(partner)}
              </p>
            ) : null}
            <ItemFeedbackText message={feedbackFor(item.id)} />
            {finished && explainFor?.(item.id)}

            {!readOnly && (
              <button
                type="button"
                id={`${listId}-toggle`}
                aria-expanded={isOpen}
                aria-controls={listId}
                onClick={() => setOpen(isOpen ? null : item.id)}
                className="mt-3 flex min-h-11 w-full items-center justify-between rounded-lg border border-line-strong px-3 text-sm font-medium text-fg hover:bg-surface-raised"
              >
                {partner ? "Change" : "Choose a match"}
                <ChevronDown aria-hidden className={cn("size-4 text-subtle transition-transform", isOpen && "rotate-180")} />
              </button>
            )}
            {isOpen && (
              <ul id={listId} aria-label={`${rightLabel} for item ${index + 1}`} className="motion-reveal mt-2 flex flex-col gap-2">
                {right.map((option) => {
                  const chosen = partner === option.id;
                  const elsewhere = exclusive && !chosen && usedBy(option.id);
                  return (
                    <li key={option.id}>
                      <button
                        type="button"
                        aria-pressed={chosen}
                        onClick={() => {
                          onToggle(item.id, option.id);
                          setOpen(null);
                          // The list closes under the focused option: return focus to this item's "Change" button.
                          requestAnimationFrame(() => document.getElementById(`${listId}-toggle`)?.focus());
                        }}
                        className={cn(
                          itemBase,
                          "min-h-11 py-2.5",
                          chosen ? "border-accent bg-accent-soft" : "border-line bg-surface-sunken hover:border-line-strong",
                        )}
                      >
                        <span className={cn("min-w-0 flex-1", serifRight && "font-serif text-[0.975rem]")}>
                          {option.text}
                          {option.detail && <span className="mt-1 block font-sans text-xs text-muted">{option.detail}</span>}
                        </span>
                        {chosen && <X aria-hidden className="mt-1 size-4 text-subtle" />}
                        {chosen && <span className="sr-only">(selected; choose again to remove)</span>}
                        {elsewhere && <span className="shrink-0 text-xs text-subtle">In use</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}
