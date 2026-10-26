/**
 * The validated Gospel Labs 2.0 study content. Validation runs when this
 * module is first loaded (at build time for static pages), so invalid content
 * fails the build with a precise report instead of shipping.
 *
 * Content is large: import this module from server components (pages) and
 * pass what a client component needs as props, rather than importing it in
 * "use client" files.
 */
import { ATTRIBUTE_FILES } from "@/content/attributes";
import rawConcepts from "@/content/concepts.json";
import rawConnect from "@/content/connect/sessions.json";
import { INVESTIGATION_FILES } from "@/content/investigations";
import { PASSAGE_FILES } from "@/content/passages";
import type { ChristAttribute, ConnectSession, ExplorerPassage, Source, StudyInvestigation } from "@/domain/study/content-schema";
import {
  buildContentRegistry,
  formatContentIssues,
  nodeLabel,
  type RawStudyContent,
  type StudyContentRegistry,
} from "@/domain/study/content-registry";
import type { NodeRef } from "@/domain/study/vocabulary";

export const RAW_STUDY_CONTENT: RawStudyContent = {
  concepts: rawConcepts,
  investigations: INVESTIGATION_FILES,
  attributes: ATTRIBUTE_FILES,
  passages: PASSAGE_FILES,
  connect: rawConnect,
};

function loadStudyContent(): StudyContentRegistry {
  const { registry, issues } = buildContentRegistry(RAW_STUDY_CONTENT);
  if (issues.length > 0) {
    throw new Error(`Study content has ${issues.length} problem${issues.length === 1 ? "" : "s"}:\n${formatContentIssues(issues)}`);
  }
  return registry;
}

export const STUDY_CONTENT: StudyContentRegistry = loadStudyContent();

/** Drafts are hidden from learners in production builds, and shown in development so authors can preview them. */
const showDrafts = process.env.NODE_ENV === "development";
const visible = <T extends { status: "draft" | "ready" }>(items: readonly T[]) => items.filter((item) => showDrafts || item.status === "ready");

export const listInvestigations = (): StudyInvestigation[] => visible(STUDY_CONTENT.investigations);
export const getInvestigation = (id: string) => listInvestigations().find((item) => item.id === id);

export const listAttributes = (): ChristAttribute[] => visible(STUDY_CONTENT.attributes);
export const getAttribute = (id: string) => listAttributes().find((item) => item.id === id);

export const listPassages = (): ExplorerPassage[] => visible(STUDY_CONTENT.passages);
export const getPassage = (id: string) => listPassages().find((item) => item.id === id);

export const listConnectSessions = (): ConnectSession[] => visible(STUDY_CONTENT.connectSessions);

export const getSource = (id: string): Source | undefined => STUDY_CONTENT.sources.get(id);

/** The sources with these ids, in order, skipping unknown ids. */
export const getSources = (ids: readonly string[]): Source[] => ids.map(getSource).filter((s): s is Source => !!s);

export const getNodeLabel = (ref: NodeRef) => nodeLabel(STUDY_CONTENT, ref);
