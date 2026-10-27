import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface SettingsSectionProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}

/** One Settings section: a named region (its heading is the region's name) with an explanation beside its controls. */
export function SettingsSection({ icon: Icon, title, description, children }: SettingsSectionProps) {
  const headingId = `settings-${title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <section aria-labelledby={headingId} className="scroll-mt-24">
      <Card>
        <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,15rem)_1fr] md:gap-10">
          <div>
            <div className="flex items-center gap-3">
              <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Icon className="size-4" />
              </span>
              <h2 id={headingId} className="text-base font-semibold tracking-tight text-fg">
                {title}
              </h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">{description}</p>
          </div>
          <div className="min-w-0">{children}</div>
        </CardContent>
      </Card>
    </section>
  );
}
