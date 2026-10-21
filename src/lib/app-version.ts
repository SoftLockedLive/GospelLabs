/**
 * This build's identifier (its UTC build time, set in next.config.ts). The
 * same value is published at /version.json, so an open copy of the app can
 * tell when a different build has been deployed.
 */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
