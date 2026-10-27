import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SectionId } from "@/domain/investigation";
import { SECTIONS } from "@/domain/sections";

interface SectionPagerProps {
  current: SectionId;
  onSelect: (section: SectionId) => void;
}

export function SectionPager({ current, onSelect }: SectionPagerProps) {
  const index = SECTIONS.findIndex((s) => s.id === current);
  const previous = SECTIONS[index - 1];
  const next = SECTIONS[index + 1];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
      {previous ? (
        <Button variant="ghost" onClick={() => onSelect(previous.id)}>
          <ArrowLeft aria-hidden />
          <span className="sr-only">Previous: </span>
          {previous.title}
        </Button>
      ) : (
        <span />
      )}
      {next && (
        <Button variant="secondary" onClick={() => onSelect(next.id)} className="ml-auto">
          <span className="sr-only">Next: </span>
          {next.title}
          <ArrowRight aria-hidden />
        </Button>
      )}
    </div>
  );
}
