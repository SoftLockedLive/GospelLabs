"use client";

import { useId } from "react";
import { ChoiceCard } from "@/components/ui/choice-card";
import { HelpText } from "@/components/ui/help-text";
import { Switch } from "@/components/ui/switch";
import {
  DIFFICULTIES,
  DIFFICULTY_DESCRIPTIONS,
  DIFFICULTY_LABELS,
  STUDY_LENGTHS,
  STUDY_LENGTH_LABELS,
  type StudyLength,
} from "@/domain/study/vocabulary";
import { updatePreferences, usePreferences, type Preferences } from "@/lib/preferences";

const LENGTH_DESCRIPTIONS: Record<StudyLength, string> = {
  quick: "Follows each investigation’s main path.",
  deep: "Adds deeper steps, side questions, and time to reflect.",
};

type ActivityOption = keyof Preferences["activity"];

const ACTIVITY_OPTIONS: { key: ActivityOption; label: string; description: string }[] = [
  {
    key: "offerBranches",
    label: "Offer side questions",
    description: "Related questions you can explore during an investigation before returning to the main path.",
  },
  {
    key: "showReflections",
    label: "Show reflection prompts",
    description: "Optional places to write what you’re thinking. Never required, and never evaluated.",
  },
  {
    key: "suggestDifficulty",
    label: "Suggest a difficulty",
    description: "A light suggestion to try another level when activities feel too easy or too hard. You always choose.",
  },
];

/**
 * Preferred session length, default difficulty, and activity options. Saved in this browser and included in backups.
 * Beginning or resuming an investigation also saves its length and difficulty here (see StartScreen).
 */
export function StudyPreferences() {
  const preferences = usePreferences();
  const lengthName = useId();
  const difficultyName = useId();
  const difficultyHelpId = useId();

  return (
    <div className="flex flex-col gap-8">
      <fieldset>
        <legend className="mb-3 text-sm font-medium text-fg">Preferred session length</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {STUDY_LENGTHS.map((length) => (
            <ChoiceCard
              key={length}
              name={lengthName}
              value={length}
              checked={preferences.studyLength === length}
              onChange={() => updatePreferences({ studyLength: length })}
              label={STUDY_LENGTH_LABELS[length]}
              description={LENGTH_DESCRIPTIONS[length]}
            />
          ))}
        </div>
      </fieldset>

      <fieldset aria-describedby={difficultyHelpId}>
        <legend className="mb-1 text-sm font-medium text-fg">Default difficulty</legend>
        <HelpText id={difficultyHelpId} icon={false} className="mb-3">
          Difficulty changes the kind of thinking an activity asks for, not how many questions there are. A new
          investigation opens at the level you last started at, and you can change it at any step.
        </HelpText>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {DIFFICULTIES.map((difficulty, index) => (
            <ChoiceCard
              key={difficulty}
              name={difficultyName}
              value={difficulty}
              checked={preferences.difficulty === difficulty}
              onChange={() => updatePreferences({ difficulty })}
              label={DIFFICULTY_LABELS[difficulty]}
              description={DIFFICULTY_DESCRIPTIONS[difficulty]}
              leading={<DifficultyMark level={index + 1} />}
            />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-sm font-medium text-fg">During activities</legend>
        <div className="flex flex-col divide-y divide-line rounded-xl border border-line-strong bg-surface">
          {ACTIVITY_OPTIONS.map((option) => (
            <Switch
              key={option.key}
              className="px-4 py-3.5"
              label={option.label}
              description={option.description}
              checked={preferences.activity[option.key]}
              onChange={(checked) => updatePreferences((current) => ({ activity: { ...current.activity, [option.key]: checked } }))}
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}

/** Four small bars, filled up to the level: a shape, not a grade. */
function DifficultyMark({ level }: { level: number }) {
  return (
    <span className="flex h-4 items-end gap-0.5">
      {[1, 2, 3, 4].map((bar) => (
        <span key={bar} className={bar <= level ? "w-1 rounded-sm bg-current" : "w-1 rounded-sm bg-line-strong"} style={{ height: `${bar * 25}%` }} />
      ))}
    </span>
  );
}
