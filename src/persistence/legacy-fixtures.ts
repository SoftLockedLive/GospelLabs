/**
 * Data exactly as Gospel Labs 1.0 stored and exported it, written out by
 * hand (not built with today's factory) so compatibility tests use the real
 * old shape.
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

/** A complete backup file as exported by 1.0. */
export const BACKUP_FROM_1_0 = `${JSON.stringify(
  { format: "gospel-labs-backup", version: 1, exportedAt: "2026-10-03T08:00:00.000Z", investigations: [RECORD_FROM_1_0] },
  null,
  2,
)}\n`;
