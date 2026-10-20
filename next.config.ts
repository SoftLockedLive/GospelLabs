import type { NextConfig } from "next";

/**
 * Identifies this build. The service worker uses it to replace its caches on
 * every deployment. Vercel provides the commit SHA; local builds use the time.
 */
const appVersion =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? new Date().toISOString().replace(/\D/g, "").slice(0, 14);

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
