"use client";

/** Change difficulty or session length mid-investigation. Changes apply at once; finished steps are kept. */
import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { StudyInvestigation } from "@/domain/study/content-schema";
import { DIFFICULTIES, DIFFICULTY_DESCRIPTIONS, DIFFICULTY_LABELS, type Difficulty, type StudyLength } from "@/domain/study/vocabulary";
import { ChoiceCards } from "./choice-cards";

interface StudySettingsProps {
  investigation: StudyInvestigation;
  difficulty: Difficulty;
  length: StudyLength;
  onDifficulty: (difficulty: Difficulty) => void;
  onLength: (length: StudyLength) => void;
}

export function StudySettings({ investigation, difficulty, length, onDifficulty, onLength }: StudySettingsProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)} className="h-11 sm:h-9" aria-haspopup="dialog">
        <SlidersHorizontal aria-hidden />
        <span className="hidden sm:inline">
          {DIFFICULTY_LABELS[difficulty]} · {length === "quick" ? "Quick" : "Deep"}
        </span>
        <span className="sm:hidden">Settings</span>
        <span className="sr-only">: change difficulty or session length</span>
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Study settings"
        description="Steps you’ve finished stay finished at the level you did them. Unfinished steps switch to the new level."
        className="max-w-2xl"
        footer={
          <Button data-autofocus onClick={() => setOpen(false)}>
            Done
          </Button>
        }
      >
        <div className="flex flex-col gap-6 pb-1">
          <ChoiceCards
            legend="Difficulty"
            value={difficulty}
            onChange={onDifficulty}
            options={DIFFICULTIES.map((value) => ({ value, label: DIFFICULTY_LABELS[value], description: DIFFICULTY_DESCRIPTIONS[value] }))}
          />
          <ChoiceCards
            legend="Session"
            value={length}
            onChange={onLength}
            options={[
              { value: "quick", label: `Quick · about ${investigation.estimatedMinutes.quick} min`, description: "The core steps." },
              {
                value: "deep",
                label: `Deep · about ${investigation.estimatedMinutes.deep} min`,
                description: investigation.branches.length ? "Every step, plus side questions." : "Every step, including the deeper ones.",
              },
            ]}
          />
        </div>
      </Dialog>
    </>
  );
}
