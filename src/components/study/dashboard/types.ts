/**
 * Lightweight content summaries the dashboard page (a server component)
 * passes to the dashboard's client components, so the full study content
 * never ships to the browser just to render the home page.
 */
import type { ConnectFormat } from "@/domain/study/content-schema";
import type { InvestigationSummary } from "@/domain/study/suggestions";

export type { InvestigationSummary };

export interface AttributeSummary {
  id: string;
  name: string;
  summary: string;
}

export interface PassageSummary {
  id: string;
  title: string;
  /** The scripture reference, e.g. "Alma 7:11–13". */
  reference: string;
}

export interface ConnectSessionSummary {
  id: string;
  format: ConnectFormat;
  title: string;
}

export interface DashboardContent {
  investigations: InvestigationSummary[];
  attributes: AttributeSummary[];
  passages: PassageSummary[];
  connectSessions: ConnectSessionSummary[];
}
