"use client";

/**
 * A short tour of Gospel Labs: one step per study mode, then privacy. Offered
 * to new learners from the welcome card, to returning learners after a major
 * update, and any time from Settings › About.
 */
import { BookOpenText, Compass, HandHeart, NotebookPen, ShieldCheck, Sunrise, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

interface TourStep {
  icon: LucideIcon;
  label: string;
  title: string;
  text: string;
}

export const TOUR_STEPS: readonly TourStep[] = [
  {
    icon: Compass,
    label: "Investigate",
    title: "Start with a real question",
    text: "Guided investigations take questions people really ask and look at them with the scriptures. You work through short, hands-on activities and choose how deep to go. Hints point you back to the verses, and nothing is scored.",
  },
  {
    icon: BookOpenText,
    label: "Scripture Explorer",
    title: "Read closely",
    text: "Explore a short passage: highlight the words that stand out, see its themes and key words, and compare related scriptures.",
  },
  {
    icon: HandHeart,
    label: "Character of Christ",
    title: "Come to know His character",
    text: "Study attributes of the Savior through scripture, words to know, and accounts from His life. It helps you learn about Him; it never measures you.",
  },
  {
    icon: Sunrise,
    label: "Connect with Christ",
    title: "Time with the Savior",
    text: "A few quiet minutes with the Savior: see Him in an account from His life, think through a question about His teachings, or reflect on a verse. Nothing to finish, nothing scored.",
  },
  {
    icon: NotebookPen,
    label: "Notebook and Map",
    title: "Keep what you discover",
    text: "Finishing an investigation adds a Discovery Card to your Notebook, along with anything else you choose to save. Your Map grows from what you’ve studied.",
  },
  {
    icon: ShieldCheck,
    label: "Private by design",
    title: "Your study stays with you",
    text: "There’s no account, tracking, or AI. Everything is saved in this browser on this device, so back it up now and then in Settings. Found a problem? Report it from Settings › Send feedback.",
  },
];

interface TourDialogProps {
  open: boolean;
  onClose: () => void;
  /** The last step's button. "Start studying" by default; "Done" where the tour is a reminder (Settings, What's new). */
  finishLabel?: string;
  /** Called, after closing, when the learner finishes the tour with the last step's button. */
  onFinish?: () => void;
}

export function TourDialog({ open, onClose, finishLabel = "Start studying", onFinish }: TourDialogProps) {
  const [index, setIndex] = useState(0);
  const step = TOUR_STEPS[index];
  const last = index === TOUR_STEPS.length - 1;
  const Icon = step.icon;

  const close = () => {
    onClose();
    setIndex(0);
  };

  const finish = () => {
    close();
    onFinish?.();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="A quick tour"
      description={`Step ${index + 1} of ${TOUR_STEPS.length}`}
      footer={
        <>
          {index > 0 && (
            <Button variant="ghost" onClick={() => setIndex(index - 1)}>
              Back
            </Button>
          )}
          {last ? (
            <Button onClick={finish} data-autofocus>
              {finishLabel}
            </Button>
          ) : (
            <Button onClick={() => setIndex(index + 1)} data-autofocus>
              Next
            </Button>
          )}
        </>
      }
    >
      {/* key: each step is announced and animated as new content. */}
      <section key={index} aria-live="polite" className="motion-reveal flex flex-col gap-3 pb-1">
        <p className="flex items-center gap-2 kicker text-muted">
          <span aria-hidden className="flex size-8 items-center justify-center rounded-lg bg-accent-soft">
            <Icon className="size-4" />
          </span>
          {step.label}
        </p>
        <h3 className="font-serif text-xl leading-snug text-fg">{step.title}</h3>
        <p className="text-sm leading-relaxed text-muted">{step.text}</p>
        <ol aria-hidden className="mt-2 flex gap-1.5">
          {TOUR_STEPS.map((tourStep, i) => (
            <li key={tourStep.label} className={i === index ? "h-1.5 w-6 rounded-full bg-accent" : "h-1.5 w-1.5 rounded-full bg-line-strong"} />
          ))}
        </ol>
      </section>
    </Dialog>
  );
}
