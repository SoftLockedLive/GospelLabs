import type { ReactNode, Ref } from "react";
import type { SectionInfo } from "@/domain/sections";

interface SectionPanelProps {
  section: SectionInfo;
  /** Receives focus when the user switches sections. */
  headingRef?: Ref<HTMLHeadingElement>;
  children: ReactNode;
}

export function SectionPanel({ section, headingRef, children }: SectionPanelProps) {
  return (
    <section aria-labelledby={`section-${section.id}`} className="flex flex-col gap-7">
      <header>
        <p className="kicker text-muted">Step {section.step}</p>
        <h2
          ref={headingRef}
          id={`section-${section.id}`}
          tabIndex={-1}
          className="mt-1.5 scroll-mt-40 text-2xl font-semibold tracking-tight text-fg focus:outline-none"
        >
          {section.title}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{section.summary}</p>
      </header>
      {children}
    </section>
  );
}
