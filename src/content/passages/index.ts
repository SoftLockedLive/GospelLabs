/**
 * Every passage content file. Add new files here; a file containing
 * {"placeholder": true} is skipped until it is written (see content-registry.ts).
 */
import heWillTakeUponHim from "./he-will-take-upon-him.json";
import yeAreMyFriends from "./ye-are-my-friends.json";
import weakThingsBecomeStrong from "./weak-things-become-strong.json";
import charityNeverFaileth from "./charity-never-faileth.json";
import beholdYourLittleOnes from "./behold-your-little-ones.json";
import theProdigalSon from "./the-prodigal-son.json";
import aStillSmallVoice from "./a-still-small-voice.json";
import experimentUponMyWords from "./experiment-upon-my-words.json";

export const PASSAGE_FILES: Record<string, unknown> = {
  "he-will-take-upon-him": heWillTakeUponHim,
  "ye-are-my-friends": yeAreMyFriends,
  "weak-things-become-strong": weakThingsBecomeStrong,
  "charity-never-faileth": charityNeverFaileth,
  "behold-your-little-ones": beholdYourLittleOnes,
  "the-prodigal-son": theProdigalSon,
  "a-still-small-voice": aStillSmallVoice,
  "experiment-upon-my-words": experimentUponMyWords,
};
