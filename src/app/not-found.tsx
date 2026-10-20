import { Compass } from "lucide-react";
import { PageContainer } from "@/components/layout/app-shell";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <PageContainer>
      <EmptyState
        headingLevel={1}
        icon={Compass}
        title="Page not found"
        description="This page or investigation doesn't exist. It may have been moved or deleted."
        action={<ButtonLink href="/">Back to dashboard</ButtonLink>}
        className="mt-10 bg-surface"
      />
    </PageContainer>
  );
}
