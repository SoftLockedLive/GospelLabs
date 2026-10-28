import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/layout/app-shell";
import { SETTINGS_PAGES } from "@/components/settings/settings-pages";
import { PageHeader } from "@/components/ui/page-header";
import { displayVersion } from "@/domain/changelog";
import { APP_RELEASE } from "@/lib/app-version";

export const metadata: Metadata = { title: "Settings" };

/** The Settings list: one row per page, in a plain list with hairlines, like a phone's own settings. */
export default function SettingsPage() {
  return (
    <PageContainer className="flex max-w-3xl flex-col gap-6">
      <PageHeader title="Settings" />
      <nav aria-label="Settings">
        <ul className="flex flex-col divide-y divide-line border-y border-line">
          {SETTINGS_PAGES.map(({ href, title, description, icon: Icon }) => (
            <li key={href}>
              <Link href={href} className="group flex min-h-16 items-center gap-4 rounded-lg py-3 hover:bg-surface-raised sm:px-2">
                <Icon aria-hidden className="size-6 shrink-0 text-muted" strokeWidth={1.75} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[1.0625rem] font-semibold text-fg">{title}</span>
                  <span className="block text-sm text-muted">{href === "/settings/about" ? `Gospel Labs ${displayVersion(APP_RELEASE)}, what’s new, and art credits` : description}</span>
                </span>
                <ChevronRight aria-hidden className="size-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <p className="text-sm leading-relaxed text-muted">
        Gospel Labs is an independent study tool and is not an official product of The Church of Jesus Christ of Latter-day
        Saints.
      </p>
    </PageContainer>
  );
}
