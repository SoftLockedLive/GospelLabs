"use client";

/**
 * The opening of a guided investigation: the question and why it matters,
 * what learners asked, the primary question it rests on, and the choice of
 * difficulty and session length. Resuming shows where the learner left off.
 * The way in (Begin, or Resume) is offered right under the question too, so
 * nobody has to scroll past the introduction to start; the full setup below
 * is where difficulty and length change. Beginning or resuming saves the
 * level and length as the learner's preferences, so the next investigation
 * opens the same way.
 *
 * When the session is blocked, nothing here can replace the stored progress:
 * progress saved by a newer version is shown read-only with a reload, and
 * while the stored record can't be read the only way in is to study without
 * saving.
 */
import { ArrowLeft, ArrowRight, BookMarked, ChevronDown, Compass, MessageCircleQuestionMark, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Eyebrow } from "@/components/ui/page-header";
import type { StudyInvestigation } from "@/domain/study/content-schema";
import { findStep, mainPath } from "@/domain/study/engine/path";
import { completionState } from "@/domain/study/engine/status";
import type { StudyProgress } from "@/domain/study/user-data";
import {
  DIFFICULTIES,
  DIFFICULTY_DESCRIPTIONS,
  DIFFICULTY_LABELS,
  PRIMARY_QUESTION_TEXT,
  type Difficulty,
  type StudyLength,
} from "@/domain/study/vocabulary";
import { formatDate } from "@/lib/format";
import { readPreferences, updatePreferences, type Preferences } from "@/lib/preferences";
import { investigateHref } from "@/lib/routes";
import { cn } from "@/lib/cn";
import { ChoiceCards } from "./choice-cards";
import { StorageNotice } from "./save-status";
import type { SessionBlock } from "./use-study-session";

/** Elder Corbridge's devotional, for the primary-question explanation (the page is titled "Stand Forever"; the URL slug is "stand-for-ever"). */
const STAND_FOR_EVER_URL = "https://speeches.byu.edu/talks/lawrence-e-corbridge/stand-for-ever/";

interface StartScreenProps {
  investigation: StudyInvestigation;
  progress: StudyProgress | null;
  preferences: Preferences;
  /** Why the progress can't be started or resumed as usual (see StudySession.blocked). */
  blocked?: SessionBlock | null;
  onStart: (settings: { difficulty: Difficulty; length: StudyLength }) => void;
  onRestart: () => void;
  onReview: () => void;
}

const reload = () => window.location.reload();

export function StartScreen({ investigation, progress, preferences, blocked = null, onStart, onRestart, onReview }: StartScreenProps) {
  // Choices default to the saved progress, else the learner's preferences (which load after hydration).
  const [difficultyChoice, setDifficulty] = useState<Difficulty | null>(null);
  const [lengthChoice, setLength] = useState<StudyLength | null>(null);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const difficulty = difficultyChoice ?? progress?.difficulty ?? preferences.difficulty;
  const length = lengthChoice ?? progress?.length ?? preferences.studyLength;
  const completion = progress ? completionState(investigation, { ...progress, length }) : null;
  const completed = !!progress?.completedAt;
  const commonQuestions = investigation.commonQuestions.slice(0, 3);

  function begin() {
    // Looking back through a finished investigation, or studying without saving, isn't a choice about how to study next.
    if (!blocked && !completed) rememberStudySettings(difficulty, length);
    onStart({ difficulty, length });
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <Link
        href={investigateHref()}
        className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-md text-sm text-muted transition-colors hover:text-fg sm:min-h-0 sm:py-1"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Guided investigations
      </Link>

      <header className="motion-reveal">
        <Eyebrow>{investigation.theme}</Eyebrow>
        <h1 tabIndex={-1} className="mt-3 text-2xl font-semibold tracking-tight text-fg outline-none sm:text-3xl">
          {investigation.title}
        </h1>
        <p className="mt-4 font-serif text-xl leading-snug text-fg sm:text-2xl">{investigation.question}</p>
        <p className="mt-3 text-base leading-relaxed text-muted">{investigation.hook}</p>
      </header>

      {!completed && !blocked && (
        <section
          aria-label={progress ? "Continue" : "Begin"}
          className="motion-reveal flex flex-col gap-3 rounded-xl border border-accent/30 bg-accent-soft p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
        >
          <p className="text-sm leading-relaxed text-fg">
            {progress && completion
              ? `You’re on step ${Math.min(completion.currentIndex + 1, completion.total)} of ${completion.total}.`
              : `${DIFFICULTY_LABELS[difficulty]} · ${length === "quick" ? "Quick" : "Deep"}, about ${investigation.estimatedMinutes[length]} min.`}{" "}
            <a href="#study-setup" className="text-accent underline underline-offset-2 hover:text-accent-strong">
              {progress ? "Change level or length" : "Change"}
            </a>
          </p>
          <Button onClick={begin} className="shrink-0">
            {progress ? "Resume" : "Begin"}
            <ArrowRight aria-hidden />
          </Button>
        </section>
      )}

      {completed && progress?.completedAt && (
        <section aria-label="Completed" className="flex flex-col gap-3 rounded-xl border border-green/35 bg-green-soft p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <p className="flex items-start gap-2.5 text-sm leading-relaxed text-fg">
            <Sparkles aria-hidden className="mt-0.5 size-4 shrink-0 text-green" />
            You completed this investigation on {formatDate(progress.completedAt)}.
          </p>
          {!blocked && (
            <Button variant="secondary" onClick={onReview} className="shrink-0">
              <BookMarked aria-hidden />
              Review your discovery
            </Button>
          )}
        </section>
      )}

      <p className="text-[0.975rem] leading-relaxed text-fg">{investigation.intro}</p>

      {commonQuestions.length > 0 && (
        <section aria-labelledby="common-questions" className="rounded-xl border border-line bg-surface p-5 sm:p-6">
          <h2 id="common-questions" className="flex items-center gap-2 text-sm font-semibold text-fg">
            <MessageCircleQuestionMark aria-hidden className="size-4 text-accent" />
            Questions people ask
          </h2>
          <ul className="mt-4 flex flex-col gap-3">
            {commonQuestions.map((question) => (
              <li key={question} className="border-l-2 border-accent/40 pl-4 font-serif text-[0.975rem] leading-relaxed text-fg">
                {question}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-subtle">This investigation looks for what the sources say.</p>
        </section>
      )}

      <PrimaryQuestionCard investigation={investigation} />

      {blocked?.reason === "newer-content" ? (
        <section aria-labelledby="study-setup" className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <div>
            <h2 id="study-setup" className="text-base font-semibold text-fg">
              Your progress
            </h2>
            {/* Newer progress may stand on a step this version doesn't have. */}
            {progress && !completed && completion && findStep(investigation, progress.position) && (
              <p className="mt-1 text-sm leading-relaxed text-muted">
                You were on step {Math.min(completion.currentIndex + 1, completion.total)} of {completion.total}.
              </p>
            )}
          </div>
          <StorageNotice title="Your progress is kept as it was saved." message={blocked.message} detail="" onRetry={reload} retryLabel="Reload" />
        </section>
      ) : (
        <section aria-labelledby="study-setup" className="flex flex-col gap-6 rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <div>
            <h2 id="study-setup" className="text-base font-semibold text-fg">
              {progress && !completed ? "Pick up where you left off" : "How would you like to study?"}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Difficulty changes the kind of thinking each step asks for, not how many questions there are. You can change either one at any time.
            </p>
          </div>
          {blocked && (
            <StorageNotice
              title="Your saved progress couldn’t be loaded."
              message={blocked.message}
              detail="You can still study without saving; what you do on this visit stays until you leave the page."
              onRetry={reload}
              retryLabel="Reload"
            />
          )}
          <ChoiceCards
            legend="Difficulty"
            columns={4}
            value={difficulty}
            onChange={setDifficulty}
            options={DIFFICULTIES.map((value) => ({ value, label: DIFFICULTY_LABELS[value], description: DIFFICULTY_DESCRIPTIONS[value] }))}
          />
          <ChoiceCards
            legend="Session"
            value={length}
            onChange={setLength}
            options={[
              {
                value: "quick",
                label: `Quick · about ${investigation.estimatedMinutes.quick} min`,
                description: `${mainPath(investigation, "quick").length} steps: the heart of the investigation.`,
              },
              {
                value: "deep",
                label: `Deep · about ${investigation.estimatedMinutes.deep} min`,
                description: investigation.branches.length ? "Every step, plus side questions to explore along the way." : "Every step, including the deeper ones.",
              },
            ]}
          />
          {progress && !completed && (
            <p className="text-xs leading-relaxed text-subtle">Steps you&rsquo;ve finished stay finished at the level you did them.</p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button size="lg" onClick={begin} className="w-full sm:w-auto">
              {blocked
                ? "Study without saving"
                : progress && !completed && completion
                  ? `Resume · step ${Math.min(completion.currentIndex + 1, completion.total)} of ${completion.total}`
                  : completed
                    ? "Look through the steps"
                    : "Begin the investigation"}
              <ArrowRight aria-hidden />
            </Button>
            {progress && !blocked && (
              <Button variant="ghost" size="lg" onClick={() => setConfirmRestart(true)} className="w-full sm:w-auto">
                <RotateCcw aria-hidden />
                {completed ? "Study it again" : "Start over"}
              </Button>
            )}
          </div>
        </section>
      )}

      <Dialog
        open={confirmRestart}
        onClose={() => setConfirmRestart(false)}
        title={completed ? "Study it again?" : "Start over?"}
        description={
          completed
            ? "Your steps start fresh. Your Discovery Card stays in your Notebook, and finishing again updates it."
            : "Your answers in this investigation start fresh. Anything already in your Notebook stays."
        }
        footer={
          <>
            <Button variant="secondary" data-autofocus onClick={() => setConfirmRestart(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setConfirmRestart(false);
                onRestart();
              }}
            >
              {completed ? "Study it again" : "Start over"}
            </Button>
          </>
        }
      />
    </div>
  );
}

/**
 * Saves the level and length a learner begins or resumes with as their preferences. Only what differs from the
 * current preferences is written: beginning with the defaults doesn't store them as if they had been chosen
 * (updatePreferences stores only changed fields, for the same reason).
 */
function rememberStudySettings(difficulty: Difficulty, length: StudyLength) {
  const current = readPreferences();
  const change: Partial<Preferences> = {};
  if (current.difficulty !== difficulty) change.difficulty = difficulty;
  if (current.studyLength !== length) change.studyLength = length;
  if (Object.keys(change).length) updatePreferences(change);
}

function PrimaryQuestionCard({ investigation }: { investigation: StudyInvestigation }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const { id, note } = investigation.primaryQuestion;
  return (
    <section aria-labelledby="primary-question" className="rounded-xl border border-accent/25 bg-accent-soft p-5 sm:p-6">
      <h2 id="primary-question" className="flex items-center gap-2 text-sm font-semibold text-fg">
        <Compass aria-hidden className="size-4 text-accent" />
        The question beneath this one
      </h2>
      <p className="mt-3 font-serif text-lg leading-snug text-fg">{PRIMARY_QUESTION_TEXT[id]}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{note}</p>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm font-medium text-accent hover:text-accent-strong sm:min-h-0 sm:py-1"
      >
        Primary and secondary questions
        <ChevronDown aria-hidden className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div id={panelId} className="motion-reveal mt-2 flex flex-col gap-2 text-sm leading-relaxed text-muted">
          <p>
            In his BYU devotional <cite className="not-italic text-fg">Stand Forever</cite> (January 2019), Elder Lawrence E. Corbridge
            distinguished a few primary questions from the many secondary ones. He taught that the primary questions are the most
            important to answer, and that their answers give perspective for the secondary questions.
          </p>
          <p>
            Every guided investigation names the primary question it ultimately rests on, so you can see how today&rsquo;s question
            connects to the ones that matter most.
          </p>
          <a
            href={STAND_FOR_EVER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 w-fit items-center text-accent hover:text-accent-strong hover:underline sm:min-h-0"
          >
            Read the devotional on BYU Speeches
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      )}
    </section>
  );
}
