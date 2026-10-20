import { CircleHelp, Columns2, Eye, Footprints, Waypoints, type LucideIcon } from "lucide-react";
import type { ChallengeType } from "@/domain/research-challenges";

export const CHALLENGE_ICONS: Record<ChallengeType, LucideIcon> = {
  observe: Eye,
  connect: Waypoints,
  compare: Columns2,
  question: CircleHelp,
  apply: Footprints,
};
