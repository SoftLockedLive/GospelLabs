"use client";

/** Evidence Connections: connect each statement with the evidence that supports it. */
import type { EvidenceConnectResponse } from "@/domain/study/activities";
import { connectPair, evidenceOptions, isOneToOne } from "@/domain/study/activities/evidence-connect";
import type { ActivityOf } from "@/domain/study/content-schema";
import { ProvenanceLabel } from "../shared/provenance";
import { feedbackFor, markFor, type BodyProps } from "./body";
import { MatchBoard } from "./match-board";

type Props = BodyProps<ActivityOf<"evidence-connect">, EvidenceConnectResponse>;

export function EvidenceConnectActivity(props: Props) {
  const { activity, sources, response, onChange, finished } = props;
  const unchanged = (leftId: string) => (checked: EvidenceConnectResponse) => checked.pairs[leftId] === response.pairs[leftId];
  const sourceLabel = (sourceId?: string) => (sourceId && sources[sourceId] ? sources[sourceId].label : undefined);

  return (
    <MatchBoard
      leftLabel={activity.left.label}
      rightLabel={activity.right.label}
      left={activity.left.items.map((item) => ({ id: item.id, text: item.text }))}
      right={evidenceOptions(activity).map((item) => {
        const label = sourceLabel(item.sourceId);
        return { id: item.id, text: item.text, detail: label && label !== item.text ? label : undefined };
      })}
      value={response.pairs}
      exclusive={isOneToOne(activity)}
      onToggle={(left, right) => onChange(connectPair(activity, response, left, right))}
      markFor={(id) => markFor(props, id, unchanged(id))}
      feedbackFor={(id) => feedbackFor(props, id, unchanged(id))}
      finished={finished}
      explainFor={(leftId) => {
        const because = activity.pairs.find((pair) => pair.left === leftId)?.because;
        return because ? (
          <div className="motion-reveal mt-2 rounded-lg bg-surface-sunken px-3 py-2">
            <ProvenanceLabel provenance="suggested" />
            <p className="mt-1 text-sm leading-relaxed text-muted">{because}</p>
          </div>
        ) : null;
      }}
    />
  );
}
