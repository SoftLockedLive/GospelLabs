#!/usr/bin/env node
/**
 * Checks a deployed copy of Gospel Labs from the outside, read-only: the
 * security headers, cache behavior for the update manifest and service
 * worker, clean URLs, and the 404 page. Run it after every deployment.
 *
 * Usage: npm run verify:production [-- https://gospellabs.softlockedlive.com]
 *
 * If out/version.json exists (from the build you just deployed), it also
 * confirms the site is serving that build. Exits non-zero if a check fails;
 * warnings are printed but don't fail.
 */
import { readFile } from "node:fs/promises";
import { CONTENT_SECURITY_POLICY, SECURITY_HEADERS } from "./security-headers.mjs";

const base = (process.argv[2] ?? "https://gospellabs.softlockedlive.com").replace(/\/$/, "");
let failures = 0;
const ok = (message) => console.log(`ok    ${message}`);
const fail = (message) => (failures++, console.log(`FAIL  ${message}`));
const warn = (message) => console.log(`warn  ${message}`);
/** Prints a pass or a failure for one check. */
const check = (condition, passMessage, failMessage) => (condition ? ok(passMessage) : fail(failMessage));
/** Prints a pass or a warning, for checks that don't fail the run. */
const advise = (condition, passMessage, warnMessage) => (condition ? ok(passMessage) : warn(warnMessage));

async function get(path) {
  const response = await fetch(`${base}${path}`, { redirect: "manual", headers: { "Cache-Control": "no-cache" } });
  return { response, body: await response.text() };
}

const cacheIsRevalidated = (value) => /\bno-(cache|store)\b/.test(value ?? "");

// Home page: status and security headers.
const home = await get("/");
check(home.response.status === 200, "/ answers 200", `/ answered ${home.response.status}`);
for (const [name, expected] of Object.entries(SECURITY_HEADERS)) {
  const actual = home.response.headers.get(name);
  if (actual === expected) ok(`${name} is set as expected`);
  else fail(`${name} is ${actual === null ? "missing" : `"${actual}"`}, expected "${expected}"`);
}
if (home.response.headers.get("Content-Security-Policy") !== CONTENT_SECURITY_POLICY) {
  console.log("      (update scripts/security-headers.mjs if the Caddyfile changed on purpose)");
}
check(
  cacheIsRevalidated(home.response.headers.get("Cache-Control")),
  "pages are revalidated (Cache-Control: no-cache)",
  `pages have Cache-Control "${home.response.headers.get("Cache-Control")}"`,
);
advise(
  home.response.headers.get("Strict-Transport-Security"),
  "Strict-Transport-Security is set",
  "no Strict-Transport-Security header (HSTS can be enabled in front of Caddy)",
);
if (home.response.headers.get("NEL") || home.response.headers.get("Report-To")) {
  warn("NEL/Report-To headers are present: browsers may send network error reports to a third party");
}

// The update manifest must be fresh on every request.
const version = await get(`/version.json?t=${Date.now()}`);
let deployed = null;
try {
  deployed = JSON.parse(version.body).version;
} catch {
  // reported below
}
check(
  version.response.status === 200 && typeof deployed === "string",
  `/version.json reports build ${deployed}`,
  `/version.json answered ${version.response.status} without a version`,
);
check(
  cacheIsRevalidated(version.response.headers.get("Cache-Control")),
  "/version.json is never served from a cache (Cache-Control: no-cache)",
  `/version.json has Cache-Control "${version.response.headers.get("Cache-Control")}"`,
);
try {
  const local = JSON.parse(await readFile(new URL("../out/version.json", import.meta.url), "utf8")).version;
  advise(
    local === deployed,
    `the site serves the local build in out/ (${local})`,
    `the site serves build ${deployed}, but out/ holds build ${local}`,
  );
} catch {
  // No local build to compare with.
}

// The service worker. The app registers /sw.js?v=<build>, a new URL for every
// build, and browsers bypass the HTTP cache when checking a worker for updates,
// so a long cache lifetime here (Cloudflare's edge sets one for .js files) only
// earns a warning.
const worker = await get(`/sw.js?v=${encodeURIComponent(deployed ?? "check")}`);
check(worker.response.status === 200, "/sw.js answers 200", `/sw.js answered ${worker.response.status}`);
advise(
  cacheIsRevalidated(worker.response.headers.get("Cache-Control")),
  "/sw.js is revalidated (Cache-Control: no-cache)",
  `/sw.js has Cache-Control "${worker.response.headers.get("Cache-Control")}" (harmless: see the comment in this script)`,
);

// Clean URLs and the app's own 404 page.
const questions = await get("/questions");
check(
  questions.response.status === 200 && questions.body.includes("Question Bank"),
  "/questions serves questions.html",
  `/questions answered ${questions.response.status}`,
);
const missing = await get("/this-page-does-not-exist");
check(
  missing.response.status === 404 && missing.body.includes("Gospel Labs"),
  "unknown paths get the app's 404 page",
  `unknown paths answered ${missing.response.status}`,
);

console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exit(failures ? 1 : 0);
