/**
 * The optional "Come unto Christ" reflection in Conclusion. Answers are
 * stored on the investigation by prompt id (see `christReflection`), so a
 * prompt's wording can be refined without losing what the user wrote, and a
 * prompt added later doesn't disturb existing answers.
 *
 * Gospel Labs never generates, summarizes, or evaluates these answers.
 */
export interface ReflectionPrompt {
  /** Stable key in `christReflection`. Never change or reuse one. */
  id: string;
  question: string;
  placeholder: string;
}

export const COME_UNTO_CHRIST_PROMPTS: readonly ReflectionPrompt[] = [
  {
    id: "learned-about-christ",
    question: "What have you learned about Jesus Christ?",
    placeholder: "Something about Him that stood out to you in this study",
  },
  {
    id: "understand-better",
    question: "What would you like to understand better?",
    placeholder: "A question you'd like to keep studying",
  },
  {
    id: "follow-him",
    question: "How might this influence the way you follow Him?",
    placeholder: "A thought, an intention, or nothing yet",
  },
];
