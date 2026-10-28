/**
 * Data exactly as earlier versions of Gospel Labs stored and exported it,
 * written out by hand (not built with today's factory) so compatibility tests
 * use the real old shapes.
 */

/** An IndexedDB record saved by 1.0: no `challengeResponses`. */
export const RECORD_FROM_1_0 = {
  id: "0c6c4a52-legacy",
  question: "What does it mean to take up the cross?",
  sourceQuestionId: "meaningful-prayer",
  title: "Taking up the cross",
  category: "Discipleship",
  createdAt: "2026-10-01T09:00:00.000Z",
  updatedAt: "2026-10-02T10:30:00.000Z",
  currentSection: "analysis",
  context: "Prompted by a lesson.",
  subquestions: [{ id: "sq-legacy", text: "What did it mean to the first disciples?" }],
  hypotheses: [{ id: "h-legacy", statement: "Choosing discipleship every day." }],
  evidence: [
    {
      id: "ev-legacy",
      sourceType: "scripture",
      sourceTitle: "Luke 9:23",
      sourceUrl: "https://www.churchofjesuschrist.org/study/scriptures/nt/luke/9?id=p23#p23",
      observation: "Jesus says to take up the cross daily.",
      relevance: "The word daily.",
      tags: ["discipleship"],
      createdAt: "2026-10-01T09:10:00.000Z",
      updatedAt: "2026-10-01T09:10:00.000Z",
    },
  ],
  analysisNotes: "Daily, not once.",
  claims: [
    {
      id: "cl-legacy",
      section: "analysis",
      statement: "Discipleship is described as daily.",
      evidenceIds: ["ev-legacy"],
      createdAt: "2026-10-02T10:00:00.000Z",
      updatedAt: "2026-10-02T10:30:00.000Z",
    },
  ],
  conclusion: "",
  remainingQuestions: "How does this apply to my family?",
  reflectionNotes: "",
  status: "investigating",
} as const;

/** The fields added in 1.1, as the current app fills them in for older records. */
const ADDED_IN_1_1 = {
  evidenceConnections: [],
  discoveryHighlights: [],
  challengeResponses: [],
  trailProgress: [],
  christReflection: {},
} as const;

/** How the current app reads RECORD_FROM_1_0: the fields added since then are filled in empty. */
export const RECORD_FROM_1_0_AS_READ = { ...ADDED_IN_1_1, ...RECORD_FROM_1_0 };

/** A complete backup file as exported by 1.0. */
export const BACKUP_FROM_1_0 = `${JSON.stringify(
  { format: "gospel-labs-backup", version: 1, exportedAt: "2026-10-03T08:00:00.000Z", investigations: [RECORD_FROM_1_0] },
  null,
  2,
)}\n`;

/**
 * A record saved by the first 1.1 build (research challenges, before
 * discovery trails): it has `challengeResponses` but no `trailProgress`.
 */
export const RECORD_BEFORE_TRAILS = {
  ...RECORD_FROM_1_0,
  id: "5d1e7f00-before-trails",
  title: "Saved before trails",
  updatedAt: "2026-10-20T16:00:00.000Z",
  challengeResponses: [
    {
      id: "cr-before-trails",
      challengeId: "observe-repeated-words",
      type: "observe",
      title: "Repeated words",
      prompt:
        "In a passage you're studying, which words or phrases appear more than once? What might the repetition emphasize?",
      response: "“Daily” appears in Luke 9:23.",
      createdAt: "2026-10-20T15:55:00.000Z",
      updatedAt: "2026-10-20T16:00:00.000Z",
    },
  ],
} as const;

export const RECORD_BEFORE_TRAILS_AS_READ = { ...ADDED_IN_1_1, ...RECORD_BEFORE_TRAILS };

/** A version 2 backup file written by that build, before `trailProgress` existed. */
export const BACKUP_V2_BEFORE_TRAILS = `${JSON.stringify(
  {
    format: "gospel-labs-backup",
    version: 2,
    exportedAt: "2026-10-20T16:05:00.000Z",
    investigations: [RECORD_BEFORE_TRAILS],
  },
  null,
  2,
)}\n`;

/**
 * A record saved by the 1.1 build with discovery trails, before evidence
 * connections: challenge responses and trail notes, but no `evidenceConnections`.
 */
export const RECORD_BEFORE_CONNECTIONS = {
  ...RECORD_BEFORE_TRAILS,
  id: "7a2c9e10-before-connections",
  title: "Saved before connections",
  updatedAt: "2026-10-20T20:00:00.000Z",
  evidence: [
    ...RECORD_FROM_1_0.evidence,
    {
      id: "ev-second",
      sourceType: "scripture",
      sourceTitle: "Mark 8:34",
      observation: "Whosoever will come after me, let him deny himself.",
      relevance: "",
      tags: [],
      createdAt: "2026-10-20T19:00:00.000Z",
      updatedAt: "2026-10-20T19:00:00.000Z",
    },
  ],
  trailProgress: [
    {
      trailId: "forgiveness-before-the-atonement",
      currentStepId: "john-8-no-condemnation",
      steps: [
        {
          stepId: "mark-2-sins-forgiven",
          title: "Sins forgiven in Capernaum",
          question: "What does Jesus say to the man brought to Him, and how do the people around Him respond?",
          discoveries: "Verse 10 ties the healing to the power to forgive.",
          explored: true,
          updatedAt: "2026-10-20T19:30:00.000Z",
        },
      ],
    },
  ],
} as const;

export const RECORD_BEFORE_CONNECTIONS_AS_READ = { ...ADDED_IN_1_1, ...RECORD_BEFORE_CONNECTIONS };

/** A version 2 backup file written by that build. */
export const BACKUP_V2_BEFORE_CONNECTIONS = `${JSON.stringify(
  {
    format: "gospel-labs-backup",
    version: 2,
    exportedAt: "2026-10-20T20:05:00.000Z",
    investigations: [RECORD_BEFORE_CONNECTIONS],
  },
  null,
  2,
)}\n`;

/**
 * A record saved by the 1.1 build with evidence connections, before
 * reflections and discovery highlights: connections, challenge responses,
 * and trail notes, but no `christReflection` or `discoveryHighlights`.
 */
export const RECORD_BEFORE_REFLECTION = {
  ...RECORD_BEFORE_CONNECTIONS,
  id: "9b4d2f30-before-reflection",
  title: "Saved before reflection",
  updatedAt: "2026-10-20T23:00:00.000Z",
  conclusion: "Discipleship is a daily choice.",
  reflectionNotes: "I want to remember this.",
  evidenceConnections: [
    {
      id: "conn-before-reflection",
      fromEvidenceId: "ev-legacy",
      toEvidenceId: "ev-second",
      relationship: "supports",
      explanation: "Both describe taking up the cross.",
      createdAt: "2026-10-20T22:30:00.000Z",
      updatedAt: "2026-10-20T22:30:00.000Z",
    },
  ],
} as const;

export const RECORD_BEFORE_REFLECTION_AS_READ = { ...ADDED_IN_1_1, ...RECORD_BEFORE_REFLECTION };

/** A version 2 backup file written by that build. */
export const BACKUP_V2_BEFORE_REFLECTION = `${JSON.stringify(
  {
    format: "gospel-labs-backup",
    version: 2,
    exportedAt: "2026-10-20T23:05:00.000Z",
    investigations: [RECORD_BEFORE_REFLECTION],
  },
  null,
  2,
)}\n`;

/**
 * A record saved by the released Gospel Labs 1.1: stamped `dataVersion: 2`,
 * with every 1.1 field filled in, including the Research tab last shown.
 */
export const RECORD_FROM_1_1 = {
  ...RECORD_BEFORE_REFLECTION,
  id: "c3e5a7b9-from-1-1",
  dataVersion: 2,
  title: "Saved by 1.1",
  updatedAt: "2026-10-21T09:00:00.000Z",
  researchActivity: "connections",
  discoveryHighlights: [
    {
      id: "hl-from-1-1",
      title: "Discipleship is daily",
      insight: "Luke adds the word daily.",
      evidenceIds: ["ev-legacy", "ev-second"],
      createdAt: "2026-10-21T08:50:00.000Z",
      updatedAt: "2026-10-21T08:50:00.000Z",
    },
  ],
  christReflection: { "learned-about-christ": "He asks for daily discipleship." },
} as const;

/** 1.1 stores every field, so it reads back unchanged. */
export const RECORD_FROM_1_1_AS_READ = RECORD_FROM_1_1;

/** A complete version 2 backup file as exported by the released 1.1. */
export const BACKUP_FROM_1_1 = `${JSON.stringify(
  { format: "gospel-labs-backup", version: 2, exportedAt: "2026-10-21T09:05:00.000Z", investigations: [RECORD_FROM_1_1] },
  null,
  2,
)}\n`;

/*
 * Gospel Labs 2.0 study data and a version 3 backup, written out by hand as
 * 2.0 stores and exports them. Today they test the 2.0 format; later
 * versions keep them to prove 2.0 data still imports.
 */

/** Progress in a completed guided investigation, including a side branch and a reflection. */
export const PROGRESS_FROM_2_0 = {
  id: "he-knows-how-to-help",
  dataVersion: 1,
  contentVersion: 1,
  startedAt: "2026-10-24T18:00:00.000Z",
  updatedAt: "2026-10-24T18:20:00.000Z",
  completedAt: "2026-10-24T18:20:00.000Z",
  difficulty: "medium",
  length: "quick",
  position: { stepId: "connect" },
  steps: {
    notice: {
      status: "complete",
      difficulty: "medium",
      attempts: 2,
      hintsShown: 1,
      revealed: false,
      skipped: false,
      response: { selected: [4] },
      completedAt: "2026-10-24T18:05:00.000Z",
      updatedAt: "2026-10-24T18:05:00.000Z",
    },
    "friends/why-friends": {
      status: "started",
      difficulty: "easy",
      attempts: 0,
      hintsShown: 0,
      revealed: false,
      skipped: false,
      reflection: "He calls His disciples friends.",
      updatedAt: "2026-10-24T18:10:00.000Z",
    },
  },
  visitedBranches: ["friends"],
  discoveryId: "6f1b2c3d-card-from-2-0",
} as const;

/** The Discovery Card created when that investigation was completed. */
export const CARD_FROM_2_0 = {
  id: "6f1b2c3d-card-from-2-0",
  dataVersion: 1,
  createdAt: "2026-10-24T18:20:00.000Z",
  updatedAt: "2026-10-24T18:25:00.000Z",
  origin: {
    kind: "investigation",
    contentId: "he-knows-how-to-help",
    contentVersion: 1,
    difficulty: "medium",
    primaryQuestion: "christ",
  },
  title: "He knows how to help",
  question: "Why did Jesus Christ take upon Him our pains?",
  summary: "Alma teaches that the Savior took upon Him His people's infirmities so that He would know how to succor them.",
  sources: [
    {
      id: "alma-7-11-12",
      label: "Alma 7:11–12",
      kind: "scripture",
      url: "https://www.churchofjesuschrist.org/study/scriptures/bofm/alma/7?lang=eng&id=p11-p12#p11",
    },
  ],
  concepts: [
    { ref: "concept:atonement", label: "Atonement", demonstrated: true },
    { ref: "concept:succor", label: "Succor", demonstrated: false },
  ],
  connections: [
    {
      id: "cc-from-2-0",
      from: { ref: "scripture:alma-7-11-12", label: "Alma 7:11–12" },
      to: { ref: "concept:atonement", label: "Atonement" },
      relation: "teaches",
      sourceIds: ["alma-7-11-12"],
      note: "Alma describes what the Savior would suffer.",
      provenance: "demonstrated",
    },
  ],
  highlights: [
    {
      sourceId: "alma-7-11-12",
      verse: 12,
      text: "that he may know according to the flesh how to succor his people according to their infirmities.",
      note: "",
    },
  ],
  notes: "I want to remember verse 12.",
} as const;

/** A connection the learner added to their Map. */
export const CONNECTION_FROM_2_0 = {
  id: "8a9b0c1d-connection-from-2-0",
  dataVersion: 1,
  createdAt: "2026-10-24T19:00:00.000Z",
  updatedAt: "2026-10-24T19:00:00.000Z",
  from: { ref: "concept:atonement", label: "Atonement" },
  to: { ref: "concept:succor", label: "Succor" },
  relation: "relates-to",
  note: "He suffered so that He would know how to help.",
  sourceIds: ["alma-7-11-12"],
} as const;

/** What was explored in Scripture Explorer, and a Connect with Christ session. */
export const EXPLORATIONS_FROM_2_0 = [
  {
    id: "passage:alma-7-11-13",
    dataVersion: 1,
    kind: "passage",
    contentId: "alma-7-11-13",
    firstAt: "2026-10-25T07:00:00.000Z",
    updatedAt: "2026-10-25T07:15:00.000Z",
    completedActivities: ["notice-words"],
    vocabulary: [],
    highlights: [
      { id: "ph-from-2-0", verse: 12, start: 0, end: 6, note: "Purpose", createdAt: "2026-10-25T07:10:00.000Z" },
    ],
    note: "",
  },
  {
    id: "connect:his-invitation",
    dataVersion: 1,
    kind: "connect",
    contentId: "his-invitation",
    firstAt: "2026-10-25T21:00:00.000Z",
    updatedAt: "2026-10-25T21:00:00.000Z",
    completedActivities: [],
    vocabulary: [],
    highlights: [],
    note: "",
  },
] as const;

export const STUDY_FROM_2_0 = {
  progress: [PROGRESS_FROM_2_0],
  discoveries: [CARD_FROM_2_0],
  personalConnections: [CONNECTION_FROM_2_0],
  explorations: EXPLORATIONS_FROM_2_0,
} as const;

/** Preferences as 2.0 exports them: everything the user had stored. */
export const PREFERENCES_FROM_2_0 = {
  theme: "dawn",
  motion: "subtle",
  studyLength: "deep",
  difficulty: "hard",
  activity: { offerBranches: true, showReflections: false, suggestDifficulty: true },
} as const;

/** A complete version 3 backup file as exported by 2.0, with one 1.1 investigation alongside the study data. */
export const BACKUP_FROM_2_0 = `${JSON.stringify(
  {
    format: "gospel-labs-backup",
    version: 3,
    exportedAt: "2026-10-26T08:00:00.000Z",
    investigations: [RECORD_FROM_1_1],
    study: STUDY_FROM_2_0,
    preferences: PREFERENCES_FROM_2_0,
  },
  null,
  2,
)}\n`;

/*
 * Journal entries and a version 4 backup, written out by hand as Gospel Labs
 * 3.0 stores and exports them. Today they test the current format; later
 * versions keep them to prove journal entries still import.
 */

/** A thought linked to the step where it came up, and a tender mercy with no link. Most recently updated first. */
export const JOURNAL_FROM_3_0 = [
  {
    id: "3c4d5e6f-entry-from-2-3",
    dataVersion: 1,
    createdAt: "2026-10-27T07:30:00.000Z",
    updatedAt: "2026-10-27T07:45:00.000Z",
    kind: "thought",
    text: "I want to come back to this step.",
    link: { kind: "investigation", contentId: "he-knows-how-to-help", label: "He knows how to help · Step 2", stepId: "notice" },
  },
  {
    id: "7a8b9c0d-entry-from-2-3",
    dataVersion: 1,
    createdAt: "2026-10-26T21:00:00.000Z",
    updatedAt: "2026-10-26T21:00:00.000Z",
    kind: "tender-mercy",
    text: "A friend checked on me today, right when I needed it.",
  },
] as const;

export const STUDY_FROM_3_0 = { ...STUDY_FROM_2_0, journal: JOURNAL_FROM_3_0 } as const;

/** A complete version 4 backup file as exported by 3.0: the 2.0 study data and the journal. */
export const BACKUP_FROM_3_0 = `${JSON.stringify(
  {
    format: "gospel-labs-backup",
    version: 4,
    exportedAt: "2026-10-27T08:00:00.000Z",
    investigations: [RECORD_FROM_1_1],
    study: STUDY_FROM_3_0,
    preferences: PREFERENCES_FROM_2_0,
  },
  null,
  2,
)}\n`;
