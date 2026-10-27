import { Bug, Lightbulb } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { APP_RELEASE, APP_VERSION, FEEDBACK_EMAIL, feedbackMailto } from "@/lib/feedback";

export function FeedbackLinks() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-muted">
        Found something that isn&rsquo;t working, or have an idea that would help your study? Email{" "}
        <a href={`mailto:${FEEDBACK_EMAIL}`} className="rounded-sm py-1 text-accent underline underline-offset-2">
          {FEEDBACK_EMAIL}
        </a>
        .
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <a href={feedbackMailto("bug")} className={buttonClasses({ variant: "secondary" })}>
          <Bug aria-hidden />
          Report a bug
        </a>
        <a href={feedbackMailto("idea")} className={buttonClasses({ variant: "secondary" })}>
          <Lightbulb aria-hidden />
          Suggest an idea
        </a>
      </div>
      <p className="text-xs leading-relaxed text-subtle">
        These open your email app with a short template. Nothing is sent until you send it, and nothing you&rsquo;ve saved
        is ever attached; include only what you&rsquo;re comfortable sharing. Version {APP_RELEASE} (build {APP_VERSION}).
      </p>
    </div>
  );
}
