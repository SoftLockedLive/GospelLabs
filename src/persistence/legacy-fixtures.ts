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
