import type { EvidenceCard } from "@/domain/investigation";

/**
 * Display labels (E1, E2, …) follow the evidence list order. They are for
 * reading only; claims link to evidence by id, so labels can shift safely.
 */
export function evidenceLabels(evidence: readonly EvidenceCard[]): Map<string, string> {
  return new Map(evidence.map((card, index) => [card.id, `E${index + 1}`]));
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
