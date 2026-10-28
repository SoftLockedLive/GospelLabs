import type { ReactNode } from "react";
import { PageContainer } from "@/components/layout/app-shell";
import { BackLink } from "@/components/ui/back-link";

interface SettingsPageProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}

/** One Settings page: a way back to the Settings list, the page's title, and its contents in a reading column. */
export function SettingsPage({ title, description, children }: SettingsPageProps) {
  return (
    <PageContainer className="flex max-w-3xl flex-col gap-6">
      <div>
        <BackLink href="/settings">Settings</BackLink>
        <h1 className="text-title mt-2 text-fg">{title}</h1>
        {description && <p className="mt-2 text-base leading-relaxed text-muted">{description}</p>}
      </div>
      {children}
    </PageContainer>
  );
}

/** A titled part of a Settings page: a heading (which names the region) and its controls. */
export function SettingsGroup({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  const headingId = `settings-${title.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4 border-t border-line pt-6">
      <div>
        <h2 id={headingId} className="text-heading text-fg">
          {title}
        </h2>
        {description && <p className="mt-1 text-[0.9375rem] leading-relaxed text-muted">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
