/**
 * Shared vocabulary for Gospel Labs 2.0 study content and user data: the
 * difficulty levels, investigation phases, learning methods, source kinds,
 * Discovery Map node kinds, and relationship types. Everything that labels or
 * links study material uses these lists, so content, the engine, the
 * Notebook, and the Map always agree.
 */

/** Difficulty changes the depth of reasoning an activity asks for, not how many questions there are. */
export const DIFFICULTIES = ["easy", "medium", "hard", "complex"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  complex: "Complex",
};

/**
 * What each level asks for, in a few plain words a 14-year-old knows (the
 * start screen, Settings, and the study settings show them under the labels).
 * Each is a verb phrase, since difficulty suggestions read it after "asks you
 * to" ("Hard asks you to weigh what the sources say").
 */
export const DIFFICULTY_DESCRIPTIONS: Record<Difficulty, string> = {
  easy: "Spot it in the verses",
  medium: "Connect the pieces",
  hard: "Weigh what the sources say",
  complex: "Put it all together",
};

export function isDifficulty(value: unknown): value is Difficulty {
  return DIFFICULTIES.includes(value as Difficulty);
}

/** Quick sessions follow the core path; deep sessions add deeper steps and side questions. */
export const STUDY_LENGTHS = ["quick", "deep"] as const;
export type StudyLength = (typeof STUDY_LENGTHS)[number];

/**
 * How long a session takes, in minutes, across the investigations (each one's own estimate is in its
 * content, set by scripts/estimate-study-time.mjs). A test keeps every investigation inside these.
 */
export const STUDY_LENGTH_MINUTES: Record<StudyLength, readonly [number, number]> = {
  quick: [20, 30],
  deep: [30, 40],
};

const minutes = (length: StudyLength) => `${STUDY_LENGTH_MINUTES[length][0]}–${STUDY_LENGTH_MINUTES[length][1]} min`;

export const STUDY_LENGTH_LABELS: Record<StudyLength, string> = {
  quick: `Quick study (${minutes("quick")})`,
  deep: `Deep study (${minutes("deep")})`,
};

/** "20–25 min" */
export const studyLengthMinutes = minutes;

/**
 * Conceptual phases of an investigation: Question → Evidence → Interactive
 * Discovery → Understanding (→ Saved Discovery, which the app creates). Steps
 * are tagged with a phase; phases are not mandatory screens.
 */
export const PHASES = ["question", "evidence", "discover", "understand"] as const;
export type Phase = (typeof PHASES)[number];

export const PHASE_LABELS: Record<Phase, string> = {
  question: "Question",
  evidence: "Evidence",
  discover: "Discover",
  understand: "Understanding",
};

/**
 * Methods of learning described by Elder Lawrence E. Corbridge in "Stand Forever"
 * (BYU devotional, 22 January 2019): the scientific, analytical,
 * academic, and divine methods. He taught that all four "begin the same way:
 * with a question," and that the divine method incorporates the others.
 * Steps may be tagged with the method they practice.
 */
export const LEARNING_METHODS = ["scientific", "analytical", "academic", "divine"] as const;
export type LearningMethod = (typeof LEARNING_METHODS)[number];

export const LEARNING_METHOD_LABELS: Record<LearningMethod, string> = {
  scientific: "Experiment upon the word",
  analytical: "Weigh the evidence",
  academic: "Study the word",
  divine: "Seek the Spirit",
};

export const LEARNING_METHOD_DESCRIPTIONS: Record<LearningMethod, string> = {
  scientific: "Act on a teaching and notice what happens (Alma 32:27; John 7:17).",
  analytical: "Gather, organize, and weigh what the sources say (D&C 9:7–8).",
  academic: "Read the written word closely and treasure it up (D&C 84:85).",
  divine: "Ask God and listen for the Holy Ghost, who can teach all things (John 14:26).",
};

/**
 * Elder Corbridge's four "primary questions." Every investigation names the
 * primary question it ultimately rests on, so learners can see how secondary
 * questions relate to the most important ones.
 */
export const PRIMARY_QUESTIONS = ["god", "christ", "joseph", "kingdom"] as const;
export type PrimaryQuestion = (typeof PRIMARY_QUESTIONS)[number];

export const PRIMARY_QUESTION_TEXT: Record<PrimaryQuestion, string> = {
  god: "Is there a God who is our Father?",
  christ: "Is Jesus Christ the Son of God, the Savior of the world?",
  joseph: "Was Joseph Smith a prophet?",
  kingdom: "Is The Church of Jesus Christ of Latter-day Saints the kingdom of God on the earth?",
};

/**
 * Who a source speaks for. The app always shows this label, so learners can
 * tell canonized scripture from official Church teaching, an individual
 * speaker's teaching, and historical or scholarly analysis. Learner
 * interpretations and AI-generated text are never sources; the UI labels
 * them separately.
 */
export const SOURCE_KINDS = ["scripture", "official", "speaker", "scholarly"] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

export const SOURCE_KIND_LABELS: Record<SourceKind, string> = {
  scripture: "Scripture",
  official: "Official Church resource",
  speaker: "Speaker’s teaching",
  scholarly: "Historical or scholarly analysis",
};

/** Kinds of Discovery Map nodes. A node is referred to as "kind:id", e.g. "concept:atonement". */
export const NODE_KINDS = ["scripture", "concept", "question", "attribute", "vocabulary", "investigation"] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

export const NODE_KIND_LABELS: Record<NodeKind, string> = {
  scripture: "Scripture",
  concept: "Gospel concept",
  question: "Question",
  attribute: "Christlike attribute",
  vocabulary: "Vocabulary",
  investigation: "Investigation",
};

export type NodeRef = `${NodeKind}:${string}`;

const NODE_REF_PATTERN = /^(scripture|concept|question|attribute|vocabulary|investigation):([a-z0-9]+(?:-[a-z0-9]+)*)$/;

export function parseNodeRef(ref: string): { kind: NodeKind; id: string } | null {
  const match = NODE_REF_PATTERN.exec(ref);
  return match ? { kind: match[1] as NodeKind, id: match[2] } : null;
}

export function isNodeRef(value: unknown): value is NodeRef {
  return typeof value === "string" && NODE_REF_PATTERN.test(value);
}

export const nodeRef = (kind: NodeKind, id: string): NodeRef => `${kind}:${id}`;

/** Node ref for one of the primary questions, e.g. "question:primary-christ". */
export const primaryQuestionRef = (question: PrimaryQuestion): NodeRef => `question:primary-${question}`;

/**
 * How two Discovery Map nodes relate. Every relation reads from the first
 * node to the second ("Alma 7:11–13 teaches Atonement"), except "relates-to"
 * and "contrasts-with", which read both ways.
 */
export const RELATIONS = [
  "teaches",
  "illustrates",
  "supports",
  "leads-to",
  "part-of",
  "contrasts-with",
  "relates-to",
  "answers",
  "raises",
  "rests-on",
] as const;
export type Relation = (typeof RELATIONS)[number];

export const RELATION_PHRASES: Record<Relation, string> = {
  teaches: "teaches",
  illustrates: "illustrates",
  supports: "supports",
  "leads-to": "leads to",
  "part-of": "is part of",
  "contrasts-with": "contrasts with",
  "relates-to": "relates to",
  answers: "helps answer",
  raises: "raises",
  "rests-on": "rests on",
};

export const RELATION_LABELS: Record<Relation, string> = {
  teaches: "Teaches",
  illustrates: "Illustrates",
  supports: "Supports",
  "leads-to": "Leads to",
  "part-of": "Part of",
  "contrasts-with": "Contrasts with",
  "relates-to": "Relates to",
  answers: "Helps answer",
  raises: "Raises",
  "rests-on": "Rests on",
};

export const isSymmetricRelation = (relation: Relation) => relation === "relates-to" || relation === "contrasts-with";

/** Verdicts in a Compare Perspectives activity. */
export const VERDICTS = ["supported", "beyond", "contradicted"] as const;
export type Verdict = (typeof VERDICTS)[number];

export const VERDICT_LABELS: Record<Verdict, string> = {
  supported: "Supported by these sources",
  beyond: "Goes beyond these sources",
  contradicted: "Contradicted by these sources",
};

/**
 * Who produced a piece of text the learner sees. The UI labels every
 * explanation with its provenance, and never presents app or AI text as
 * doctrine, revelation, or the learner's own discovery.
 */
export const PROVENANCES = ["demonstrated", "suggested", "user", "ai"] as const;
export type Provenance = (typeof PROVENANCES)[number];

export const PROVENANCE_LABELS: Record<Provenance, string> = {
  demonstrated: "You discovered",
  suggested: "Suggested by Gospel Labs",
  user: "Your interpretation",
  ai: "AI-generated—not doctrine or revelation",
};
