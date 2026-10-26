/**
 * Test fixtures for study content and data. The investigation below is a
 * small but complete, schema-valid example (verse text copied from the
 * original with scripts/scripture.mjs). It is never shipped to learners.
 */
import type { RawStudyContent } from "./content-registry";

export const ALMA_7_11_12 = {
  id: "alma-7-11-12",
  kind: "scripture",
  label: "Alma 7:11–12",
  url: "https://www.churchofjesuschrist.org/study/scriptures/bofm/alma/7?lang=eng&id=p11-p12#p11",
  verses: [
    {
      number: 11,
      text: "And he shall go forth, suffering pains and afflictions and temptations of every kind; and this that the word might be fulfilled which saith he will take upon him the pains and the sicknesses of his people.",
    },
    {
      number: 12,
      text: "And he will take upon him death, that he may loose the bands of death which bind his people; and he will take upon him their infirmities, that his bowels may be filled with mercy, according to the flesh, that he may know according to the flesh how to succor his people according to their infirmities.",
    },
  ],
} as const;

export const JOHN_15_13_15 = {
  id: "john-15-13-15",
  kind: "scripture",
  label: "John 15:13–15",
  url: "https://www.churchofjesuschrist.org/study/scriptures/nt/john/15?lang=eng&id=p13-p15#p13",
  verses: [
    { number: 13, text: "Greater love hath no man than this, that a man lay down his life for his friends." },
    { number: 14, text: "Ye are my friends, if ye do whatsoever I command you." },
    {
      number: 15,
      text: "Henceforth I call you not servants; for the servant knoweth not what his lord doeth: but I have called you friends; for all things that I have heard of my Father I have made known unto you.",
    },
  ],
} as const;

const highlightStep = {
  type: "highlight",
  id: "find-why",
  prompt: "Tap the phrase that tells why He would take upon Him His people's infirmities.",
  sourceIds: ["alma-7-11-12"],
  hints: ["Look for the word “that” in verse 12: it often introduces a purpose.", "The answer is near the end of verse 12."],
  explanation: "Verse 12 gives the purpose: “that he may know according to the flesh how to succor his people according to their infirmities.”",
  passage: "alma-7-11-12",
  chunks: [
    { verse: 12, text: "And he will take upon him death," },
    { verse: 12, text: "that he may loose the bands of death which bind his people;" },
    { verse: 12, text: "and he will take upon him their infirmities," },
    { verse: 12, text: "that his bowels may be filled with mercy, according to the flesh," },
    { verse: 12, text: "that he may know according to the flesh how to succor his people according to their infirmities." },
  ],
  targets: [4],
};

export const SAMPLE_INVESTIGATION = {
  id: "sample-investigation",
  status: "ready",
  contentVersion: 1,
  title: "He knows how to help",
  question: "Why did Jesus Christ take upon Him our pains?",
  hook: "Alma gives a reason that goes beyond paying for sin.",
  theme: "Jesus Christ",
  tags: ["atonement"],
  primaryQuestion: { id: "christ", note: "Knowing why He suffered helps answer who He is." },
  commonQuestions: [],
  estimatedMinutes: { quick: 6, deep: 20 },
  intro: "Alma testified of the Savior's coming and described what He would suffer.",
  sources: [ALMA_7_11_12, JOHN_15_13_15],
  concepts: [],
  steps: [
    {
      id: "notice",
      title: "Notice what He takes upon Him",
      phase: "evidence",
      method: "academic",
      sourceIds: ["alma-7-11-12"],
      activities: {
        easy: highlightStep,
        medium: { ...highlightStep, id: "find-why-medium" },
        hard: { ...highlightStep, id: "find-why-hard" },
        complex: { ...highlightStep, id: "find-why-complex" },
      },
      insight: "Alma lists pains, afflictions, temptations, sicknesses, death, and infirmities.",
      concepts: ["atonement", "succor"],
      connections: [
        { from: "scripture:alma-7-11-12", to: "concept:atonement", relation: "teaches", sourceIds: ["alma-7-11-12"], note: "Alma describes what the Savior would suffer." },
      ],
      branchIds: ["friends"],
    },
    {
      id: "connect",
      title: "Connect the purpose",
      phase: "discover",
      method: "analytical",
      sourceIds: ["alma-7-11-12", "john-15-13-15"],
      activities: {
        easy: {
          type: "sort",
          id: "sort-suffering",
          prompt: "Sort each item by where it appears.",
          hints: ["Read verse 11, then verse 12."],
          explanation: "Verse 11 names pains, afflictions, and temptations; verse 12 names death and infirmities.",
          categories: [
            { id: "v11", label: "Verse 11" },
            { id: "v12", label: "Verse 12" },
          ],
          items: [
            { id: "temptations", text: "Temptations of every kind", category: "v11", why: "Verse 11." },
            { id: "death", text: "Death", category: "v12", why: "Verse 12." },
            { id: "infirmities", text: "Infirmities", category: "v12", why: "Verse 12." },
          ],
        },
        medium: {
          type: "evidence-connect",
          id: "connect-purpose",
          prompt: "Connect each statement with the verse that supports it.",
          hints: ["One statement is about love; the other is about knowing how to help."],
          explanation: "Alma 7:12 gives the purpose of knowing how to succor; John 15:13 speaks of laying down one's life.",
          left: {
            label: "Statement",
            items: [
              { id: "succor", text: "He suffered so He would know how to help His people." },
              { id: "love", text: "Laying down one's life is the greatest love." },
            ],
          },
          right: {
            label: "Evidence",
            items: [
              { id: "alma", text: "Alma 7:12", sourceId: "alma-7-11-12" },
              { id: "john", text: "John 15:13", sourceId: "john-15-13-15" },
            ],
          },
          pairs: [
            { left: "succor", right: "alma", because: "Alma says “that he may know according to the flesh how to succor his people.”" },
            { left: "love", right: "john", because: "John 15:13 says “Greater love hath no man than this.”" },
          ],
        },
        hard: {
          type: "compare",
          id: "compare-claims",
          prompt: "Decide how well each perspective fits Alma 7:11–12.",
          hints: ["Check whether the verses say it, leave it open, or say the opposite."],
          explanation: "The verses state His purpose to know how to succor; they don't describe how this happened.",
          perspectives: [
            { id: "p1", text: "He suffered so that He would know how to help us.", verdict: "supported", rationale: "Verse 12 states this purpose." },
            { id: "p2", text: "Alma explains exactly how His suffering worked.", verdict: "beyond", rationale: "The verses state what and why, not how." },
            { id: "p3", text: "He suffered only for sins, not for sicknesses.", verdict: "contradicted", rationale: "Verse 11 names sicknesses." },
          ],
        },
        complex: {
          type: "build-principle",
          id: "build-principle",
          prompt: "Build a principle the two passages support together.",
          hints: ["Start with who suffered.", "End with the purpose from Alma 7:12."],
          explanation: "Together the passages show love and purpose in His suffering.",
          fragments: [
            { id: "a", text: "Jesus Christ took upon Him our pains and infirmities" },
            { id: "b", text: "so that He would know how to succor us" },
            { id: "c", text: "because He had to learn what pain is from books" },
          ],
          solution: ["a", "b"],
          statement: "Jesus Christ took upon Him our pains and infirmities so that He would know how to succor us.",
        },
      },
      insight: "His suffering had a purpose: to know how to help each of His people.",
      concepts: ["succor"],
      connections: [
        { from: "concept:atonement", to: "vocabulary:succor", relation: "leads-to", sourceIds: ["alma-7-11-12"], note: "He took upon Him infirmities so He would know how to succor." },
      ],
    },
    {
      id: "reflect",
      title: "Reflect",
      phase: "understand",
      method: "divine",
      activity: { type: "reflect", id: "reflect-succor", prompt: "Where might you let Him succor you?", suggestions: [] },
      insight: "Reflection is personal and optional.",
    },
  ],
  branches: [
    {
      id: "friends",
      question: "What does it mean that He calls us friends?",
      intro: "John 15 records the Savior calling His disciples friends.",
      steps: [
        {
          id: "friends-step",
          title: "Servants and friends",
          phase: "evidence",
          activities: {
            medium: {
              type: "clue",
              id: "friends-clue",
              prompt: "What difference does the Savior name between a servant and a friend?",
              hints: ["Read verse 15 closely."],
              explanation: "A friend is told what the Lord is doing: “all things that I have heard of my Father I have made known unto you.”",
              clues: [
                { id: "c1", title: "Verse 14", text: "He names a condition for friendship.", sourceId: "john-15-13-15" },
                { id: "c2", title: "Verse 15", text: "He contrasts what a servant knows with what a friend is told.", sourceId: "john-15-13-15" },
              ],
              question: {
                id: "q",
                prompt: "What makes the difference?",
                options: [
                  { id: "told", text: "Friends are told what the Lord is doing." },
                  { id: "rank", text: "Friends have a higher rank.", feedback: "Look for what the servant doesn't know." },
                ],
                correct: ["told"],
              },
            },
          },
          insight: "Friendship with Him includes being taught.",
        },
      ],
    },
  ],
  discovery: {
    summary: "Alma 7:11–12 teaches that the Savior took upon Him pains, sicknesses, and infirmities so that He would know how to succor His people.",
    keyIdeas: ["He suffered more than sin.", "His suffering had a purpose: to know how to help."],
    christConnection: "He knows how to help because He chose to experience what His people experience.",
    openQuestions: [],
  },
  review: { status: "verified", notes: [] },
};

export const EMPTY_CONTENT: RawStudyContent = {
  concepts: { concepts: [] },
  investigations: {},
  attributes: {},
  passages: {},
  connect: { sessions: [] },
};

export const CORE_CONCEPTS_FIXTURE = {
  concepts: [
    { id: "atonement", kind: "concept", label: "Atonement of Jesus Christ", description: "The Savior's atoning sacrifice." },
    { id: "succor", kind: "vocabulary", label: "Succor", description: "To run to help." },
  ],
};

export const SAMPLE_CONTENT: RawStudyContent = {
  ...EMPTY_CONTENT,
  concepts: CORE_CONCEPTS_FIXTURE,
  investigations: { "sample-investigation": SAMPLE_INVESTIGATION },
};
