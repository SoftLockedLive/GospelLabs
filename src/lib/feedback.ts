/**
 * Feedback goes by email, composed in the user's own email app. Gospel Labs
 * never sends anything itself; the templates only include what's shown here.
 */
import { APP_VERSION } from "./app-version";

export { APP_VERSION };

export const FEEDBACK_EMAIL = "gospellabs@proton.me";

export type FeedbackKind = "bug" | "idea";

const TEMPLATES: Record<FeedbackKind, { subject: string; body: string[] }> = {
  bug: {
    subject: "Gospel Labs bug report",
    body: [
      "What happened?",
      "",
      "",
      "What did you expect to happen?",
      "",
      "",
      "Steps to make it happen again (if you know them):",
      "1. ",
      "",
      "Device and browser (for example, iPhone with Safari):",
      "",
    ],
  },
  idea: {
    subject: "Gospel Labs idea",
    body: ["What would you like Gospel Labs to do?", "", "", "How would it help your study?", "", ""],
  },
};

/**
 * A mailto: link with a subject and a short template. `details` (for example
 * an error message) is appended after the template for the user to keep or delete.
 */
export function feedbackMailto(kind: FeedbackKind, details?: string): string {
  const { subject, body } = TEMPLATES[kind];
  const lines = [...body, ...(details ? [details, ""] : []), `App version: ${APP_VERSION}`];
  // encodeURIComponent, not URLSearchParams: some email apps show "+" literally instead of a space.
  // RFC 6068 asks for CRLF line breaks in mailto bodies.
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\r\n"))}`;
}
