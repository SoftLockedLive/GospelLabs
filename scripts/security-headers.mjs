/**
 * The response headers Gospel Labs is served with in production. Caddy on
 * Atlas sets them (the gospellabs block of its Caddyfile, plus that file's
 * site-wide defaults); nothing in the static export can.
 *
 * This copy is used by the local server (scripts/serve-out.mjs), so the
 * end-to-end tests run under the real Content-Security-Policy, and by
 * scripts/verify-production.mjs, which checks the live site still matches.
 * If you change the headers on Atlas, change them here too.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

export const SECURITY_HEADERS = {
  "Content-Security-Policy": CONTENT_SECURITY_POLICY,
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
};

/** Every response is revalidated, so updates (including /version.json and /sw.js) show up right away. */
export const CACHE_CONTROL = "no-cache";
