/**
 * Builds the validated registry of all study content: investigations,
 * Character of Christ attributes, Scripture Explorer passages, Connect with
 * Christ sessions, sources, and concepts. Pure: the loader in
 * src/lib/study-content.ts passes in the raw JSON, and tests do the same.
 *
 * Beyond each file's own schema, this checks everything that spans files:
 * unique ids; shared sources declared identically; every referenced source,
 * concept, attribute, branch, and Map node exists; highlight passages match
 * their verses word for word; key phrases appear in their verses; and ready
 * investigations offer all four difficulties on every core step.
 */
import { z } from "zod";
import {
  attributeSchema,
  conceptSchema,
  connectSessionSchema,
  investigationSchema,
  passageSchema,
  sourceSchema,
  type Activity,
  type ChristAttribute,
  type Concept,
  type ConnectionDef,
  type ConnectSession,
  type ExplorerPassage,
  type Source,
  type Step,
  type StudyInvestigation,
} from "./content-schema";
import {
  DIFFICULTIES,
  parseNodeRef,
  PRIMARY_QUESTIONS,
  PRIMARY_QUESTION_TEXT,
  type Difficulty,
  type NodeRef,
} from "./vocabulary";

/** A content file that hasn't been written yet. Skipped, and reported by the completeness test. */
export interface PlaceholderFile {
  placeholder: true;
  id: string;
}

export const isPlaceholder = (value: unknown): value is PlaceholderFile =>
  typeof value === "object" && value !== null && (value as { placeholder?: unknown }).placeholder === true;

export interface RawStudyContent {
  concepts: unknown;
  investigations: Record<string, unknown>;
  attributes: Record<string, unknown>;
  passages: Record<string, unknown>;
  connect: unknown;
}

export interface ContentIssue {
  file: string;
  message: string;
}

export interface StudyContentRegistry {
  investigations: StudyInvestigation[];
  attributes: ChristAttribute[];
  passages: ExplorerPassage[];
  connectSessions: ConnectSession[];
  sources: Map<string, Source>;
  concepts: Map<string, Concept>;
  /** Vocabulary defined by attributes, keyed by vocabulary id. */
  attributeVocabulary: Map<string, { attributeId: string; term: string; meaning: string }>;
  /** Files still marked as placeholders. */
  placeholders: string[];
}

function describe(issue: z.core.$ZodIssue): string {
  const path = issue.path.map(String).join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}

/** Verse text normalized for comparison: straight quotes, single spaces. */
export const normalizeVerseText = (value: string) =>
  value
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();

/** The activity used at a difficulty: its own, else the step's shared one, else the nearest difficulty that has one. */
export function resolveActivity(step: Step, difficulty: Difficulty): { activity: Activity; difficulty: Difficulty } {
  if (step.activities[difficulty]) return { activity: step.activities[difficulty], difficulty };
  if (step.activity) return { activity: step.activity, difficulty };
  const index = DIFFICULTIES.indexOf(difficulty);
  const byDistance = [...DIFFICULTIES].sort((a, b) => {
    const da = Math.abs(DIFFICULTIES.indexOf(a) - index);
    const db = Math.abs(DIFFICULTIES.indexOf(b) - index);
    // Ties prefer the easier level.
    return da - db || DIFFICULTIES.indexOf(a) - DIFFICULTIES.indexOf(b);
  });
  for (const candidate of byDistance) {
    const activity = step.activities[candidate];
    if (activity) return { activity, difficulty: candidate };
  }
  throw new Error(`Step "${step.id}" has no activity`);
}

/** Every activity in a step, with the difficulties it serves. */
export function stepActivities(step: Step): Activity[] {
  const list = DIFFICULTIES.map((difficulty) => step.activities[difficulty]).filter((a): a is Activity => !!a);
  if (step.activity) list.push(step.activity);
  return list;
}

/** Source ids an activity refers to anywhere: its evidence list and every item that cites a source. */
export function activitySourceIds(activity: Activity): string[] {
  const ids = new Set(activity.sourceIds);
  switch (activity.type) {
    case "evidence-connect":
      for (const item of [...activity.left.items, ...activity.right.items]) if (item.sourceId) ids.add(item.sourceId);
      break;
    case "clue":
      for (const clue of activity.clues) if (clue.sourceId) ids.add(clue.sourceId);
      break;
    case "scripture-connect":
      for (const id of activity.passages) ids.add(id);
      break;
    case "vocab-match":
      for (const pair of activity.pairs) if (pair.example) ids.add(pair.example.sourceId);
      break;
    case "highlight":
      ids.add(activity.passage);
      break;
  }
  return [...ids];
}

export function buildContentRegistry(raw: RawStudyContent): { registry: StudyContentRegistry; issues: ContentIssue[] } {
  const issues: ContentIssue[] = [];
  const placeholders: string[] = [];
  const sources = new Map<string, Source>();
  const sourceOrigins = new Map<string, string>();
  const concepts = new Map<string, Concept>();

  const report = (file: string, message: string) => issues.push({ file, message });

  function addSources(file: string, list: readonly Source[]) {
    for (const source of list) {
      const existing = sources.get(source.id);
      if (existing && JSON.stringify(existing) !== JSON.stringify(source)) {
        report(file, `source "${source.id}" differs from its declaration in ${sourceOrigins.get(source.id)}; shared sources must be identical`);
        continue;
      }
      if (!existing) {
        sources.set(source.id, source);
        sourceOrigins.set(source.id, file);
      }
    }
  }

  function addConcepts(file: string, list: readonly Concept[]) {
    for (const concept of list) {
      const existing = concepts.get(concept.id);
      if (existing && JSON.stringify(existing) !== JSON.stringify(concept)) {
        report(file, `concept "${concept.id}" is already defined differently`);
        continue;
      }
      concepts.set(concept.id, concept);
    }
  }

  // Core concepts.
  const conceptFile = z.object({ concepts: z.array(conceptSchema) }).safeParse(raw.concepts);
  if (conceptFile.success) addConcepts("concepts.json", conceptFile.data.concepts);
  else report("concepts.json", describe(conceptFile.error.issues[0]));

  function parseAll<T>(group: string, files: Record<string, unknown>, schema: z.ZodType<T>): T[] {
    const parsed: T[] = [];
    for (const [name, value] of Object.entries(files)) {
      const file = `${group}/${name}.json`;
      if (isPlaceholder(value)) {
        placeholders.push(file);
        continue;
      }
      const result = schema.safeParse(value);
      if (!result.success) {
        for (const issue of result.error.issues.slice(0, 8)) report(file, describe(issue));
        continue;
      }
      const id = (result.data as { id?: string }).id;
      if (id && id !== name) report(file, `id "${id}" must match the file name "${name}"`);
      parsed.push(result.data);
    }
    return parsed;
  }

  const investigations = parseAll("investigations", raw.investigations, investigationSchema);
  const attributes = parseAll("attributes", raw.attributes, attributeSchema);
  const passages = parseAll("passages", raw.passages, passageSchema);

  let connectSessions: ConnectSession[] = [];
  if (isPlaceholder(raw.connect)) placeholders.push("connect/sessions.json");
  else {
    const result = z.object({ sessions: z.array(connectSessionSchema) }).safeParse(raw.connect);
    if (result.success) connectSessions = result.data.sessions;
    else for (const issue of result.error.issues.slice(0, 8)) report("connect/sessions.json", describe(issue));
  }

  for (const investigation of investigations) {
    addSources(`investigations/${investigation.id}.json`, investigation.sources);
    addConcepts(`investigations/${investigation.id}.json`, investigation.concepts);
  }
  for (const attribute of attributes) addSources(`attributes/${attribute.id}.json`, attribute.sources);
  for (const passage of passages) addSources(`passages/${passage.id}.json`, passage.sources);
  for (const session of connectSessions) addSources("connect/sessions.json", session.sources);

  const attributeIds = new Set(attributes.map((attribute) => attribute.id));
  const attributeVocabulary = new Map<string, { attributeId: string; term: string; meaning: string }>();
  for (const attribute of attributes) {
    for (const word of attribute.vocabulary) {
      if (attributeVocabulary.has(word.id) || concepts.has(word.id)) {
        report(`attributes/${attribute.id}.json`, `vocabulary id "${word.id}" is already used`);
      }
      attributeVocabulary.set(word.id, { attributeId: attribute.id, term: word.term, meaning: word.meaning });
    }
  }

  const questionIds = new Set<string>(PRIMARY_QUESTIONS.map((question) => `primary-${question}`));
  for (const investigation of investigations) {
    questionIds.add(investigation.id);
    for (const branch of investigation.branches) questionIds.add(branch.id);
  }
  const investigationIds = new Set(investigations.map((investigation) => investigation.id));

  // --- Cross-reference checks -------------------------------------------------

  function checkSource(file: string, where: string, id: string) {
    if (!sources.has(id)) report(file, `${where}: unknown source "${id}"`);
  }

  function checkNode(file: string, where: string, ref: NodeRef) {
    const parsed = parseNodeRef(ref);
    if (!parsed) return report(file, `${where}: invalid node "${ref}"`);
    const { kind, id } = parsed;
    const ok =
      (kind === "scripture" && sources.get(id)?.kind === "scripture") ||
      (kind === "concept" && concepts.get(id)?.kind === "concept") ||
      (kind === "vocabulary" && (concepts.get(id)?.kind === "vocabulary" || attributeVocabulary.has(id))) ||
      (kind === "attribute" && attributeIds.has(id)) ||
      (kind === "investigation" && investigationIds.has(id)) ||
      (kind === "question" && questionIds.has(id));
    // Attributes that are still placeholders are allowed as targets, so content can be written in parallel.
    const pendingAttribute = kind === "attribute" && placeholders.includes(`attributes/${id}.json`);
    if (!ok && !pendingAttribute) report(file, `${where}: node "${ref}" doesn't match any ${kind}`);
  }

  function checkConnections(file: string, where: string, connections: readonly ConnectionDef[]) {
    connections.forEach((connection, index) => {
      checkNode(file, `${where}.connections[${index}].from`, connection.from);
      checkNode(file, `${where}.connections[${index}].to`, connection.to);
      if (connection.from === connection.to) report(file, `${where}.connections[${index}]: connects a node to itself`);
      for (const id of connection.sourceIds) checkSource(file, `${where}.connections[${index}]`, id);
    });
  }

  function checkActivity(file: string, where: string, activity: Activity) {
    for (const id of activitySourceIds(activity)) checkSource(file, `${where} (${activity.id})`, id);
    if (activity.type === "scripture-connect") {
      for (const id of activity.passages) {
        if (sources.has(id) && sources.get(id)?.kind !== "scripture") report(file, `${where}: passage "${id}" isn't scripture`);
      }
    }
    if (activity.type === "highlight") {
      const source = sources.get(activity.passage);
      if (!source?.verses) {
        report(file, `${where} (${activity.id}): highlight passage "${activity.passage}" needs verses`);
        return;
      }
      const verseNumbers = [...new Set(activity.chunks.map((chunk) => chunk.verse))];
      for (const number of verseNumbers) {
        const verse = source.verses.find((v) => v.number === number);
        if (!verse) {
          report(file, `${where} (${activity.id}): verse ${number} isn't in source "${source.id}"`);
          continue;
        }
        const joined = activity.chunks
          .filter((chunk) => chunk.verse === number)
          .map((chunk) => chunk.text)
          .join(" ");
        if (normalizeVerseText(joined) !== normalizeVerseText(verse.text)) {
          report(file, `${where} (${activity.id}): chunks of verse ${number} don't join to the verse text exactly`);
        }
      }
    }
  }

  function checkStep(file: string, where: string, step: Step, branchIds: Set<string>, ready: boolean, inBranch: boolean) {
    for (const id of step.sourceIds) checkSource(file, `${where}.sourceIds`, id);
    for (const id of step.concepts) {
      if (!concepts.has(id) && !attributeVocabulary.has(id)) report(file, `${where}.concepts: unknown concept "${id}"`);
    }
    for (const id of step.branchIds) if (!branchIds.has(id)) report(file, `${where}.branchIds: unknown branch "${id}"`);
    if (inBranch && step.branchIds.length) report(file, `${where}: steps inside a branch can't open other branches`);
    checkConnections(file, where, step.connections);
    for (const activity of stepActivities(step)) checkActivity(file, where, activity);
    if (ready && !inBranch && step.depth === "core") {
      const sharedReflection = step.activity?.type === "reflect";
      const missing = DIFFICULTIES.filter((difficulty) => !step.activities[difficulty]);
      if (missing.length && !sharedReflection) {
        report(file, `${where}: core steps of a ready investigation need an activity for every difficulty (missing ${missing.join(", ")})`);
      }
    }
  }

  for (const investigation of investigations) {
    const file = `investigations/${investigation.id}.json`;
    const ready = investigation.status === "ready";
    const branchIds = new Set(investigation.branches.map((branch) => branch.id));
    const stepIds = new Set<string>();
    const activityIds = new Set<string>();
    const allSteps = [...investigation.steps, ...investigation.branches.flatMap((branch) => branch.steps)];
    for (const step of allSteps) {
      if (stepIds.has(step.id)) report(file, `duplicate step id "${step.id}"`);
      stepIds.add(step.id);
      for (const activity of stepActivities(step)) {
        if (activityIds.has(activity.id) && step.activity !== activity) report(file, `duplicate activity id "${activity.id}"`);
        activityIds.add(activity.id);
      }
    }
    if (branchIds.size !== investigation.branches.length) report(file, "duplicate branch id");
    for (const id of branchIds) if (investigationIds.has(id)) report(file, `branch id "${id}" is also an investigation id`);
    investigation.steps.forEach((step, index) => checkStep(file, `steps[${index}]`, step, branchIds, ready, false));
    investigation.branches.forEach((branch, b) =>
      branch.steps.forEach((step, index) => checkStep(file, `branches[${b}].steps[${index}]`, step, branchIds, ready, true)),
    );
    const offered = new Set(investigation.steps.flatMap((step) => step.branchIds));
    for (const id of branchIds) if (!offered.has(id)) report(file, `branch "${id}" isn't offered by any step`);
    if (ready && investigation.steps.filter((step) => step.depth === "core").length < 3) {
      report(file, "a ready investigation needs at least 3 core steps");
    }
    if (ready && !investigation.steps.some((step) => step.connections.length > 0)) {
      report(file, "a ready investigation should establish at least one Discovery Map connection");
    }
  }

  for (const attribute of attributes) {
    const file = `attributes/${attribute.id}.json`;
    for (const id of attribute.definition.sourceIds) checkSource(file, "definition", id);
    for (const id of attribute.safety?.sourceIds ?? []) checkSource(file, "safety", id);
    attribute.vocabulary.forEach((word, i) => word.sourceIds.forEach((id) => checkSource(file, `vocabulary[${i}]`, id)));
    attribute.contrasts.forEach((contrast, i) => contrast.sourceIds.forEach((id) => checkSource(file, `contrasts[${i}]`, id)));
    attribute.scriptures.forEach((scripture, i) => checkSource(file, `scriptures[${i}]`, scripture.sourceId));
    attribute.saviorExamples.forEach((example, i) => checkSource(file, `saviorExamples[${i}]`, example.sourceId));
    attribute.relationships.forEach((relationship, i) => {
      if (relationship.attributeId === attribute.id) report(file, `relationships[${i}]: relates the attribute to itself`);
      const known = attributeIds.has(relationship.attributeId) || placeholders.includes(`attributes/${relationship.attributeId}.json`);
      if (!known) report(file, `relationships[${i}]: unknown attribute "${relationship.attributeId}"`);
      relationship.sourceIds.forEach((id) => checkSource(file, `relationships[${i}]`, id));
    });
    attribute.activities.forEach((activity, i) => checkActivity(file, `activities[${i}]`, activity));
  }

  for (const passage of passages) {
    const file = `passages/${passage.id}.json`;
    const source = sources.get(passage.sourceId);
    if (!source?.verses) report(file, `sourceId "${passage.sourceId}" must be a scripture source with verses`);
    for (const theme of passage.themes) {
      const pendingAttribute = placeholders.includes(`attributes/${theme.conceptId}.json`);
      if (!concepts.has(theme.conceptId) && !attributeIds.has(theme.conceptId) && !pendingAttribute) {
        report(file, `themes: unknown concept or attribute "${theme.conceptId}"`);
      }
      for (const verse of theme.verses) {
        if (source?.verses && !source.verses.some((v) => v.number === verse)) report(file, `themes: verse ${verse} isn't in the passage`);
      }
    }
    for (const phrase of passage.keyPhrases) {
      const verse = source?.verses?.find((v) => v.number === phrase.verse);
      if (!verse) report(file, `keyPhrases.${phrase.id}: verse ${phrase.verse} isn't in the passage`);
      else if (!normalizeVerseText(verse.text).includes(normalizeVerseText(phrase.phrase))) {
        report(file, `keyPhrases.${phrase.id}: "${phrase.phrase}" doesn't appear in verse ${phrase.verse}`);
      }
      phrase.sourceIds.forEach((id) => checkSource(file, `keyPhrases.${phrase.id}`, id));
    }
    passage.related.forEach((related, i) => checkSource(file, `related[${i}]`, related.sourceId));
    passage.questions.forEach((question) => question.sourceIds.forEach((id) => checkSource(file, `questions.${question.id}`, id)));
    passage.activities.forEach((activity, i) => checkActivity(file, `activities[${i}]`, activity));
    checkConnections(file, "passage", passage.connections);
  }

  const sessionIds = new Set<string>();
  for (const session of connectSessions) {
    const file = "connect/sessions.json";
    if (sessionIds.has(session.id)) report(file, `duplicate session id "${session.id}"`);
    sessionIds.add(session.id);
    if (!sources.get(session.sourceId)?.verses) report(file, `${session.id}: sourceId must be a scripture source with verses`);
    session.insights.forEach((insight, i) => insight.sourceIds.forEach((id) => checkSource(file, `${session.id}.insights[${i}]`, id)));
    if (session.format === "understand" && !session.question) report(file, `${session.id}: an Understand Christ session needs a question`);
  }

  for (const [id, concept] of concepts) {
    for (const sourceId of concept.sourceIds) checkSource("concepts", `concept "${id}"`, sourceId);
  }

  return {
    registry: { investigations, attributes, passages, connectSessions, sources, concepts, attributeVocabulary, placeholders },
    issues,
  };
}

/** A readable label for any Map node, from content. */
export function nodeLabel(registry: StudyContentRegistry, ref: NodeRef): string {
  const parsed = parseNodeRef(ref);
  if (!parsed) return ref;
  const { kind, id } = parsed;
  switch (kind) {
    case "scripture":
      return registry.sources.get(id)?.label ?? id;
    case "concept":
      return registry.concepts.get(id)?.label ?? id;
    case "vocabulary":
      return registry.concepts.get(id)?.label ?? registry.attributeVocabulary.get(id)?.term ?? id;
    case "attribute":
      return registry.attributes.find((attribute) => attribute.id === id)?.name ?? id;
    case "investigation":
      return registry.investigations.find((investigation) => investigation.id === id)?.title ?? id;
    case "question": {
      const primary = PRIMARY_QUESTIONS.find((question) => `primary-${question}` === id);
      if (primary) return PRIMARY_QUESTION_TEXT[primary];
      for (const investigation of registry.investigations) {
        if (investigation.id === id) return investigation.question;
        const branch = investigation.branches.find((b) => b.id === id);
        if (branch) return branch.question;
      }
      return id;
    }
  }
}

export function formatContentIssues(issues: readonly ContentIssue[]): string {
  return issues.map((issue) => `  - ${issue.file}: ${issue.message}`).join("\n");
}

/** Re-exported so callers can validate a single source (e.g. in tests). */
export { sourceSchema };
