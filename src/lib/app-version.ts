/**
 * This build's identifier (its UTC build time, set in next.config.ts). The
 * same value is published at /version.json, so an open copy of the app can
 * tell when a different build has been deployed.
 */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";

/**
 * The release number learners see, MAJOR.MINOR.CONTENT.PATCH (docs/VERSIONING.md),
 * from package.json via next.config.ts. Each release has an entry in
 * src/content/changelog.json. "0.0.0" only outside a Next build (unit tests).
 */
export const APP_RELEASE = process.env.NEXT_PUBLIC_APP_RELEASE ?? "0.0.0";
