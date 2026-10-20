import { ChevronDown, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChallengeResponse } from "@/domain/investigation";
import { CHALLENGE_TYPE_INFO } from "@/domain/research-challenges";
import { CHALLENGE_ICONS } from "./challenge-icons";

interface ChallengeResponseListProps {
  responses: readonly ChallengeResponse[];
  /** The challenge currently shown in the card above. */
  activeChallengeId?: string;
  onEdit: (response: ChallengeResponse) => void;
  onRemove: (id: string) => void;
}

/** Every response written for this investigation, each of which can be reopened for editing. */
export function ChallengeResponseList({ responses, activeChallengeId, onEdit, onRemove }: ChallengeResponseListProps) {
  return (
    <details className="group rounded-lg border border-line bg-surface-sunken/50">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3.5 py-2.5 text-sm text-muted hover:text-fg [&::-webkit-details-marker]:hidden">
        Your responses ({responses.length})
        <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
      </summary>
      <ul aria-label="Your challenge responses" className="flex flex-col divide-y divide-line border-t border-line">
        {responses.map((response) => {
          const Icon = CHALLENGE_ICONS[response.type];
          return (
            <li key={response.id} className="flex items-start gap-3 px-3.5 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 font-mono text-[11px] tracking-wide text-accent uppercase">
                  <Icon aria-hidden className="size-3" />
                  {CHALLENGE_TYPE_INFO[response.type].label}
                </p>
                <p className="mt-1 text-sm font-medium break-words text-fg">{response.title}</p>
                <p className="mt-1 line-clamp-3 text-sm leading-relaxed break-words whitespace-pre-line text-muted">
                  {response.response}
                </p>
                {response.challengeId === activeChallengeId && (
                  <p className="mt-1 text-xs text-subtle">Shown in the card above</p>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 px-0"
                  aria-label={`Edit your response to “${response.title}”`}
                  onClick={() => onEdit(response)}
                >
                  <Pencil aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 px-0 hover:text-danger"
                  aria-label={`Delete your response to “${response.title}”`}
                  onClick={() => onRemove(response.id)}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
