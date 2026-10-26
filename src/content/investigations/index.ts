/**
 * Every investigation content file. Add new files here; a file containing
 * {"placeholder": true} is skipped until it is written (see content-registry.ts).
 */
import oneByOne from "./one-by-one.json";
import recognizingTheSpirit from "./recognizing-the-spirit.json";
import whenFaithfulPeopleSuffer from "./when-faithful-people-suffer.json";
import againAndAgain from "./again-and-again.json";
import christAtTheCenter from "./christ-at-the-center.json";
import fearGodFriend from "./fear-god-friend.json";
import primaryQuestions from "./primary-questions.json";
import familiesBeyondTheVeil from "./families-beyond-the-veil.json";

export const INVESTIGATION_FILES: Record<string, unknown> = {
  "one-by-one": oneByOne,
  "recognizing-the-spirit": recognizingTheSpirit,
  "when-faithful-people-suffer": whenFaithfulPeopleSuffer,
  "again-and-again": againAndAgain,
  "christ-at-the-center": christAtTheCenter,
  "fear-god-friend": fearGodFriend,
  "primary-questions": primaryQuestions,
  "families-beyond-the-veil": familiesBeyondTheVeil,
};
