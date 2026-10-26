/**
 * A light difficulty suggestion, offered only if the learner wants them
 * (preferences.activity.suggestDifficulty). It looks at the most recent
 * checked steps finished at the current level, across all investigations:
 *
 *   - the last 4 were all worked out with at most one check and no hints
 *     → suggest the next level up;
 *   - at least 2 of the last 4 were revealed or skipped → suggest one down;
 *   - otherwise, nothing.
 *
 * It is a suggestion about the kind of reasoning that might suit the learner
 * next, never a judgment of them, and it is never applied automatically.
 */
import type { StepState, StudyProgress } from "../user-data";
import { DIFFICULTIES, type Difficulty } from "../vocabulary";

export const SUGGESTION_WINDOW = 4;

export interface DifficultySuggestion {
  direction: "up" | "down";
  from: Difficulty;
  difficulty: Difficulty;
}

/**
 * Steps whose activity was actually checked. Reflections are never checked,
 * so they finish with no attempts (and are never revealed or skipped).
 */
const wasChecked = (state: StepState) => state.attempts > 0 || state.revealed || state.skipped;
const isFinished = (state: StepState) => state.status === "complete" || state.skipped;
const finishedAt = (state: StepState) => Date.parse(state.completedAt ?? state.updatedAt);

export function recommendDifficulty(records: readonly StudyProgress[], current: Difficulty): DifficultySuggestion | null {
  const recent = records
    .flatMap((record) => Object.values(record.steps))
    .filter((state) => state.difficulty === current && isFinished(state) && wasChecked(state))
    .sort((a, b) => finishedAt(b) - finishedAt(a))
    .slice(0, SUGGESTION_WINDOW);

  const index = DIFFICULTIES.indexOf(current);
  const struggled = recent.filter((state) => state.revealed || state.skipped).length;
  if (struggled >= 2 && index > 0) return { direction: "down", from: current, difficulty: DIFFICULTIES[index - 1] };

  const readily = (state: StepState) => state.status === "complete" && !state.revealed && !state.skipped && state.attempts <= 1 && state.hintsShown === 0;
  if (recent.length === SUGGESTION_WINDOW && recent.every(readily) && index < DIFFICULTIES.length - 1) {
    return { direction: "up", from: current, difficulty: DIFFICULTIES[index + 1] };
  }
  return null;
}
