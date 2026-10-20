/**
 * Converts the evidence form's raw text fields into a validated EvidenceInput.
 * This is the boundary where user-typed data enters the investigation.
 */
import { z } from "zod";
import {
  EVIDENCE_SOURCE_TYPES,
  webUrlSchema,
  type EvidenceInput,
  type EvidenceSourceType,
} from "./investigation";
import type { ReferenceType, SuggestedReference } from "./question-bank";

export interface EvidenceFormValues {
  sourceType: EvidenceSourceType;
  sourceTitle: string;
  sourceUrl: string;
  observation: string;
  relevance: string;
  /** Comma-separated. */
  tags: string;
}

export type EvidenceFormErrors = Partial<Record<keyof EvidenceFormValues, string>>;

export type EvidenceFormResult = { ok: true; input: EvidenceInput } | { ok: false; errors: EvidenceFormErrors };

/** Splits "Faith, grace,,  faith " into ["faith", "grace"]: trimmed, lowercased, de-duplicated. */
export function parseTags(raw: string): string[] {
  const tags = raw
    .split(",")
    .map((tag) => tag.trim().replace(/\s+/g, " ").toLowerCase())
    .filter(Boolean);
  return [...new Set(tags)];
}

/** Adds https:// when someone types a bare address like "churchofjesuschrist.org/study". */
export function normalizeUrlInput(raw: string): string {
  const value = raw.trim();
  if (value === "" || /^[a-z][a-z0-9+.-]*:/i.test(value)) return value;
  return `https://${value}`;
}

const formSchema = z.object({
  sourceType: z.enum(EVIDENCE_SOURCE_TYPES),
  sourceTitle: z.string().trim().min(1, { error: "Add a title or reference for the source" }).max(200),
  sourceUrl: z
    .string()
    .transform(normalizeUrlInput)
    .pipe(z.union([z.literal(""), webUrlSchema]))
    .transform((url) => url || undefined),
  observation: z.string().trim().min(1, { error: "Write what you observed in this source" }).max(5000),
  relevance: z.string().trim().max(5000),
  tags: z.string().transform(parseTags),
});

export function parseEvidenceForm(values: EvidenceFormValues): EvidenceFormResult {
  const result = formSchema.safeParse(values);
  if (result.success) {
    const { sourceUrl, ...rest } = result.data;
    return { ok: true, input: sourceUrl ? { ...rest, sourceUrl } : rest };
  }
  const errors: EvidenceFormErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof EvidenceFormValues;
    errors[field] ??= issue.message;
  }
  return { ok: false, errors };
}

export function toEvidenceFormValues(input?: Partial<EvidenceInput>): EvidenceFormValues {
  return {
    sourceType: input?.sourceType ?? "scripture",
    sourceTitle: input?.sourceTitle ?? "",
    sourceUrl: input?.sourceUrl ?? "",
    observation: input?.observation ?? "",
    relevance: input?.relevance ?? "",
    tags: input?.tags?.join(", ") ?? "",
  };
}

const SOURCE_TYPE_FOR_REFERENCE: Record<ReferenceType, EvidenceSourceType> = {
  scripture: "scripture",
  "gospel-topics": "church-website",
  "general-conference": "conference-talk",
  manual: "church-manual",
  other: "other",
};

/**
 * Pre-fills the evidence form from a suggested reference. Only the source is
 * filled in; the observation and relevance must come from the user's own study.
 */
export function evidenceDraftFromReference(reference: SuggestedReference): Partial<EvidenceInput> {
  return {
    sourceType: SOURCE_TYPE_FOR_REFERENCE[reference.type],
    sourceTitle: reference.label,
    sourceUrl: reference.url,
  };
}
