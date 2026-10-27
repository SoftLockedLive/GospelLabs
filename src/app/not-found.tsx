import { Compass } from "lucide-react";
import { StatusPage } from "@/components/layout/status-page";
import { ButtonLink } from "@/components/ui/button";
import { investigateHref } from "@/lib/routes";

export default function NotFound() {
  return (
    <StatusPage
      icon={Compass}
      title="Page not found"
      description="This page doesn’t exist. It may have been moved, or the link may be incomplete. Nothing you’ve saved is affected."
      actions={
        <>
          <ButtonLink href="/">Back to Home</ButtonLink>
          <ButtonLink href={investigateHref()} variant="secondary">
            Browse investigations
          </ButtonLink>
        </>
      }
    />
  );
}
