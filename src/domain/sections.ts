import type { SectionId } from "./investigation";

export interface SectionInfo {
  id: SectionId;
  step: number;
  title: string;
  summary: string;
}

/** The five stages of an investigation. None of them is required. */
export const SECTIONS: readonly SectionInfo[] = [
  {
    id: "question",
    step: 1,
    title: "Question",
    summary: "Frame what you want to understand and why it matters to you.",
  },
  {
    id: "hypothesis",
    step: 2,
    title: "Hypothesis",
    summary: "Note your current thinking. Optional, and free to change.",
  },
  {
    id: "research",
    step: 3,
    title: "Research",
    summary: "Gather observations from scriptures and Church resources.",
  },
  {
    id: "analysis",
    step: 4,
    title: "Analysis",
    summary: "Compare sources, notice patterns, and weigh what you found.",
  },
  {
    id: "conclusion",
    step: 5,
    title: "Conclusion",
    summary: "Record what you understand now and what remains open.",
  },
];

export function getSection(id: SectionId): SectionInfo {
  const section = SECTIONS.find((s) => s.id === id);
  if (!section) throw new Error(`Unknown section: ${id}`);
  return section;
}
