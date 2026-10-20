"use client";

import { Plus, X } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

interface TextListEditorProps {
  items: { id: string; text: string }[];
  /** Adds an empty item and returns its id. */
  onAdd: () => string;
  onUpdate: (id: string, text: string) => void;
  onRemove: (id: string) => void;
  itemLabel: string;
  placeholder: string;
  addLabel: string;
}

/** Edits an ordered list of short text entries (subquestions, hypotheses). */
export function TextListEditor({ items, onAdd, onUpdate, onRemove, itemLabel, placeholder, addLabel }: TextListEditorProps) {
  const [focusId, setFocusId] = useState<string | null>(null);
  // Stable callback, so focus moves only when the new item mounts.
  const focusOnMount = useCallback((element: HTMLTextAreaElement | null) => element?.focus(), []);

  return (
    <div className="flex flex-col gap-3">
      {items.length > 0 && (
        <ol className="flex flex-col gap-3">
          {items.map((item, index) => (
            <li key={item.id} className="flex items-start gap-3">
              <span aria-hidden className="mt-2.5 w-5 shrink-0 text-right font-mono text-xs text-subtle">
                {index + 1}.
              </span>
              <Textarea
                ref={item.id === focusId ? focusOnMount : undefined}
                rows={2}
                aria-label={`${itemLabel} ${index + 1}`}
                placeholder={placeholder}
                value={item.text}
                onChange={(event) => onUpdate(item.id, event.target.value)}
              />
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 size-8 px-0"
                aria-label={`Remove ${itemLabel.toLowerCase()} ${index + 1}`}
                onClick={() => onRemove(item.id)}
              >
                <X aria-hidden />
              </Button>
            </li>
          ))}
        </ol>
      )}
      <div>
        <Button variant="secondary" size="sm" onClick={() => setFocusId(onAdd())}>
          <Plus aria-hidden />
          {addLabel}
        </Button>
      </div>
    </div>
  );
}
