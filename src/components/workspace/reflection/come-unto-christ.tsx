"use client";

import { Field, Textarea } from "@/components/ui/input";
import type { Investigation } from "@/domain/investigation";
import { COME_UNTO_CHRIST_PROMPTS } from "@/domain/reflection";
import type { InvestigationActions } from "../use-investigation";

/**
 * Optional reflection connecting the study with the user's understanding of
 * Jesus Christ. Every answer is the user's own; nothing here is required,
 * scored, or evaluated, and it has no bearing on the investigation's status.
 */
export function ComeUntoChrist({ investigation, actions }: { investigation: Investigation; actions: InvestigationActions }) {
  return (
    <section
      aria-labelledby="come-unto-christ-heading"
      className="rounded-xl border border-accent/25 bg-linear-to-b from-accent-soft to-transparent p-4 sm:p-6"
    >
      <p className="kicker text-muted">Reflection · optional</p>
      <h3 id="come-unto-christ-heading" className="mt-1.5 text-lg font-semibold tracking-tight text-fg">
        Come unto Christ
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        A few questions to connect what you&rsquo;ve studied with your understanding of Jesus Christ and how you follow
        Him. Answer any, all, or none. Your words stay on this device, and Gospel Labs never evaluates them.
      </p>

      <div className="mt-6 flex flex-col gap-6">
        {COME_UNTO_CHRIST_PROMPTS.map((prompt) => (
          <Field key={prompt.id} label={prompt.question}>
            {(props) => (
              <Textarea
                {...props}
                rows={3}
                placeholder={prompt.placeholder}
                value={investigation.christReflection[prompt.id] ?? ""}
                onChange={(event) => actions.setReflection(prompt.id, event.target.value)}
              />
            )}
          </Field>
        ))}
        <Field label="Other reflections">
          {(props) => (
            <Textarea
              {...props}
              rows={3}
              placeholder="Personal impressions, feelings, or commitments"
              value={investigation.reflectionNotes}
              onChange={(event) => actions.setText("reflectionNotes", event.target.value)}
            />
          )}
        </Field>
      </div>
    </section>
  );
}
