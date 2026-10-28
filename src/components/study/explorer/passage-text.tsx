"use client";

/**
 * The passage, verbatim, as tappable words. Learners select a contiguous run
 * of words in one verse (tap words, or use the keyboard), then save it as a
 * highlight. Saved highlights, a theme's verses, and a key phrase are shown
 * in place. The text itself is never altered: words are rendered exactly as
 * in the source, split on whitespace.
 *
 * Keyboard: the passage is one tab stop. Arrow keys move between words
 * (Up/Down jump between verses, Home/End to a verse's first/last word),
 * Enter or Space selects a word or extends the selection to it,
 * Shift+Left/Right extends the selection, and Escape clears it.
 */
import { Fragment, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { Source } from "@/domain/study/content-schema";
import { rangeBetween, rangeIncludes, tapWord, verseWords, type WordRange } from "@/domain/study/explorer";
import type { PassageHighlight } from "@/domain/study/user-data";
import { cn } from "@/lib/cn";

interface WordKey {
  verse: number;
  index: number;
}

const keyOf = ({ verse, index }: WordKey) => `${verse}:${index}`;

interface PassageTextProps {
  source: Source;
  highlights: readonly PassageHighlight[];
  selection: WordRange | null;
  onSelectionChange: (selection: WordRange | null) => void;
  /** A theme's verses: the rest of the passage is quieted. */
  emphasizedVerses?: ReadonlySet<number> | null;
  /** A key phrase, underlined in place. */
  emphasizedRange?: WordRange | null;
  /** The highlight just saved, for a brief confirmation. */
  recentHighlightId?: string | null;
  /** True until stored highlights have loaded. */
  disabled?: boolean;
  className?: string;
}

export function PassageText({
  source,
  highlights,
  selection,
  onSelectionChange,
  emphasizedVerses,
  emphasizedRange,
  recentHighlightId,
  disabled,
  className,
}: PassageTextProps) {
  const instructionsId = useId();
  const verses = source.verses ?? [];
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const anchor = useRef<WordKey | null>(null);
  const [focused, setFocused] = useState<WordKey | null>(null);

  // Every selectable word, in reading order.
  const order: WordKey[] = verses.flatMap((verse) =>
    verseWords(verse.text)
      .filter((word) => word.selectable)
      .map((word) => ({ verse: verse.number, index: word.index })),
  );
  // The one word in the tab order: the focused word, else the selection's first word (or the next selectable one), else the first word.
  const candidate = focused ?? (selection ? { verse: selection.verse, index: selection.start } : undefined);
  const tabStop = (candidate && order.find((w) => w.verse === candidate.verse && w.index >= candidate.index)) ?? order[0];

  // Changing the selection regroups the words (so a highlight's background runs across the spaces between them),
  // which re-creates their buttons and would drop focus to the page. Put it back on the learner's word.
  const restoreFocus = useRef(false);
  useLayoutEffect(() => {
    if (!restoreFocus.current) return;
    restoreFocus.current = false;
    if (focused && document.activeElement !== buttons.current.get(keyOf(focused))) buttons.current.get(keyOf(focused))?.focus();
  });

  const changeSelection = (next: WordRange | null) => {
    restoreFocus.current = true;
    onSelectionChange(next);
  };

  const focusWord = (word: WordKey | undefined) => {
    if (!word) return;
    setFocused(word);
    buttons.current.get(keyOf(word))?.focus();
  };

  const tap = (word: WordKey) => {
    const next = tapWord(selection, word.verse, word.index);
    if (!selection || selection.verse !== word.verse || !next) anchor.current = next ? word : null;
    setFocused(word);
    changeSelection(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, word: WordKey) => {
    const at = order.findIndex((w) => w.verse === word.verse && w.index === word.index);
    const inVerse = order.filter((w) => w.verse === word.verse);
    let target: WordKey | undefined;
    switch (event.key) {
      case "ArrowRight":
        target = order[at + 1];
        break;
      case "ArrowLeft":
        target = order[at - 1];
        break;
      case "ArrowDown":
        target = order.find((w) => w.verse > word.verse);
        break;
      case "ArrowUp": {
        const previousVerse = [...order].reverse().find((w) => w.verse < word.verse)?.verse;
        target = order.find((w) => w.verse === previousVerse);
        break;
      }
      case "Home":
        target = inVerse[0];
        break;
      case "End":
        target = inVerse[inVerse.length - 1];
        break;
      case "Escape":
        if (!selection) return;
        event.preventDefault();
        anchor.current = null;
        changeSelection(null);
        return;
      default:
        return;
    }
    event.preventDefault();
    if (!target) return;
    const extending = event.shiftKey && (event.key === "ArrowRight" || event.key === "ArrowLeft") && target.verse === word.verse;
    if (extending) {
      if (!selection || selection.verse !== word.verse || !anchor.current || anchor.current.verse !== word.verse) anchor.current = word;
      changeSelection(rangeBetween(word.verse, anchor.current.index, target.index));
    }
    focusWord(target);
  };

  return (
    <div className={className}>
      <p id={instructionsId} className="sr-only">
        Select words to highlight. Arrow keys move between words; Up and Down move between verses. Enter selects a word or extends the
        selection to it, Shift with Left or Right extends the selection, and Escape clears it.
      </p>
      <div
        role="group"
        aria-label={`${source.label}, words you can highlight`}
        aria-describedby={instructionsId}
        className="prose-scripture flex flex-col gap-3 text-fg"
      >
        {verses.map((verse) => {
          const quiet = !!emphasizedVerses && !emphasizedVerses.has(verse.number);
          const emphasized = !!emphasizedVerses && emphasizedVerses.has(verse.number);
          const words = verseWords(verse.text);
          // Group consecutive words that share a state, so a highlight's background runs across the spaces between its words.
          const groups: { key: string; highlight?: PassageHighlight; selected: boolean; words: typeof words }[] = [];
          for (const word of words) {
            const selected = rangeIncludes(selection, verse.number, word.index);
            const highlight = selected ? undefined : highlights.find((h) => rangeIncludes(h, verse.number, word.index));
            const key = selected ? "selected" : highlight ? `h:${highlight.id}` : "plain";
            const last = groups[groups.length - 1];
            if (last && last.key === key) last.words.push(word);
            else groups.push({ key, highlight, selected, words: [word] });
          }

          return (
            <p
              key={verse.number}
              data-verse={verse.number}
              className={cn(
                "-mx-2 rounded-lg px-2 py-1 leading-[2.15] transition-colors duration-300",
                quiet && "text-subtle",
                emphasized && "bg-accent-soft motion-glow",
              )}
            >
              <b className="mr-1.5 text-[0.85em] font-bold select-none">{verse.number}</b>
              {groups.map((group, g) => {
                const content: ReactNode = group.words.map((word, w) => {
                  const key = { verse: verse.number, index: word.index };
                  const underlined = rangeIncludes(emphasizedRange, verse.number, word.index);
                  return (
                    <Fragment key={word.index}>
                      {w > 0 && " "}
                      {word.selectable ? (
                        <button
                          ref={(element) => {
                            if (element) buttons.current.set(keyOf(key), element);
                            else buttons.current.delete(keyOf(key));
                          }}
                          type="button"
                          disabled={disabled}
                          tabIndex={tabStop && keyOf(tabStop) === keyOf(key) ? 0 : -1}
                          aria-pressed={group.selected}
                          onClick={() => tap(key)}
                          onKeyDown={(event) => onKeyDown(event, key)}
                          onFocus={() => setFocused(key)}
                          className={cn(
                            "cursor-pointer rounded-[3px] text-left [font:inherit] transition-colors outline-offset-1 disabled:cursor-default",
                            !group.selected && !group.highlight && "hover:bg-accent-soft",
                            underlined && "underline decoration-accent decoration-2 underline-offset-[5px]",
                          )}
                        >
                          {word.text}
                        </button>
                      ) : (
                        <span>{word.text}</span>
                      )}
                    </Fragment>
                  );
                });
                return (
                  <Fragment key={`${group.key}-${g}`}>
                    {g > 0 && " "}
                    {group.selected ? (
                      <span className="rounded-sm bg-accent px-0.5 text-accent-fg [box-decoration-break:clone]">{content}</span>
                    ) : group.highlight ? (
                      <mark
                        className={cn(
                          "rounded-sm bg-highlight px-0.5 text-highlight-fg [box-decoration-break:clone]",
                          group.highlight.conceptId && "underline decoration-highlight-line decoration-2 underline-offset-[5px]",
                          // Box-shadow based, so it works across the line fragments of an inline highlight.
                          group.highlight.id === recentHighlightId && "motion-glow",
                        )}
                      >
                        {content}
                      </mark>
                    ) : (
                      content
                    )}
                  </Fragment>
                );
              })}
            </p>
          );
        })}
      </div>
    </div>
  );
}
