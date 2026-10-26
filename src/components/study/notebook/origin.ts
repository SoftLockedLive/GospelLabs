/**
 * Where a Discovery Card came from, and how to get back there. Shared by the
 * Notebook and the Discovery Map.
 */
import { BookOpenText, FlaskConical, HeartHandshake, Sunrise, type LucideIcon } from "lucide-react";
import type { DiscoveryOrigin } from "@/domain/study/user-data";
import { characterHref, connectHref, explorerHref, studyInvestigationHref } from "@/lib/routes";

export const ORIGIN_ICONS: Record<DiscoveryOrigin, LucideIcon> = {
  investigation: FlaskConical,
  passage: BookOpenText,
  attribute: HeartHandshake,
  connect: Sunrise,
};

/** The page the card's study happened on. */
export function originHref(origin: { kind: DiscoveryOrigin; contentId: string }): string {
  switch (origin.kind) {
    case "investigation":
      return studyInvestigationHref(origin.contentId);
    case "passage":
      return explorerHref(origin.contentId);
    case "attribute":
      return characterHref(origin.contentId);
    case "connect":
      return connectHref(origin.contentId);
  }
}

export const ORIGIN_LINK_LABELS: Record<DiscoveryOrigin, string> = {
  investigation: "Open the investigation",
  passage: "Open in Scripture Explorer",
  attribute: "Open in Character of Christ",
  connect: "Open Connect with Christ",
};
