import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface SettingsSectionProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}

export function SettingsSection({ icon: Icon, title, description, children }: SettingsSectionProps) {
  const headingId = `settings-${title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <section aria-labelledby={headingId}>
      <Card>
        <CardContent className="grid gap-6 md:grid-cols-[minmax(0,16rem)_1fr] md:gap-10">
          <div>
            <div className="flex items-center gap-2.5">
              <Icon aria-hidden className="size-4 text-accent" />
              <h2 id={headingId} className="text-base font-semibold tracking-tight text-fg">
                {title}
              </h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
          </div>
          <div className="min-w-0">{children}</div>
        </CardContent>
      </Card>
    </section>
  );
}
