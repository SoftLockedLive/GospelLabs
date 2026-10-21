import { APP_VERSION } from "@/lib/app-version";

/**
 * /version.json: the deployed build's identifier, exported as a static file.
 * Open copies of the app fetch it (never from a cache) to notice updates.
 */
export const dynamic = "force-static";

export function GET() {
  return Response.json({ version: APP_VERSION });
}
