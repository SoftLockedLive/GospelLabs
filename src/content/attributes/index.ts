/**
 * Every attribute content file. Add new files here; a file containing
 * {"placeholder": true} is skipped until it is written (see content-registry.ts).
 */
import charity from "./charity.json";
import humility from "./humility.json";
import patience from "./patience.json";
import meekness from "./meekness.json";
import mercy from "./mercy.json";
import compassion from "./compassion.json";
import obedience from "./obedience.json";
import forgiveness from "./forgiveness.json";
import longSuffering from "./long-suffering.json";

export const ATTRIBUTE_FILES: Record<string, unknown> = {
  "charity": charity,
  "humility": humility,
  "patience": patience,
  "meekness": meekness,
  "mercy": mercy,
  "compassion": compassion,
  "obedience": obedience,
  "forgiveness": forgiveness,
  "long-suffering": longSuffering,
};
