import { readFileSync } from "node:fs";
import type { NextConfig } from "next";

/**
 * Identifies this build: its UTC build time, e.g. 20261020221921. The service
 * worker uses it to replace its caches on every deployment, and Settings shows
 * it so bug reports can name the build.
 */
const appVersion = new Date().toISOString().replace(/\D/g, "").slice(0, 14);

/**
 * The release number learners see (MAJOR.MINOR.CONTENT.PATCH; see docs/VERSIONING.md).
 * package.json is its only source; src/content/changelog.json must have a
 * matching entry (checked by tests), so the app, the changelog, and the git tag agree.
 */
const appRelease = (JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string }).version;

/**
 * Gospel Labs is a static export served by Caddy on Atlas (see scripts/deploy.sh).
 * Static files can't set response headers, so the Content-Security-Policy and
 * other security headers, and the no-cache header on /sw.js, are set in the
 * gospellabs block of Atlas's /opt/web/Caddyfile. Change them there.
 */
const nextConfig: NextConfig = {
  // `next build` writes plain files to out/.
  output: "export",
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
    NEXT_PUBLIC_APP_RELEASE: appRelease,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
