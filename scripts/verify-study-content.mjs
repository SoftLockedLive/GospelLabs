#!/usr/bin/env node
/**
 * Verifies Gospel Labs 2.0 study content (src/content/) against original sources.
 *
 * For every source:
 *   - Church links (https://www.churchofjesuschrist.org/study/…) must resolve
 *     to that exact page in the Gospel Library content service; highlighted
 *     verses (id=pX-pY) must exist; scripture labels like "Alma 7:11–13" must
 *     match the page and the verses selected.
 *   - Scripture `verses` must match the original text word for word.
 *   - An `excerpt` must appear verbatim in the source page.
 *   - BYU Speeches links are fetched and excerpts checked the same way.
 *   - Other hosts can't be checked automatically and are listed for manual review.
 *
 * For every content file, every quotation (text inside curly double quotes
 * “…”) must appear verbatim in one of the sources that file declares.
 * Ellipses and [bracketed] insertions are allowed inside quotations.
 * Privacy: when data/private/learner-questions.json is present, no content may contain survey text
 * (any run of 7 words from a response). Survey responses must never ship in the app.
 *
 * This confirms that links open the intended pages and that quoted words are
 * real. It cannot confirm that a source supports an interpretation; that is
 * what each file's `review` section and the release report are for.
 *
 * Usage: npm run verify:study   (requires network access; exits non-zero on failure)
 *        npm run verify:study -- --offline   (structure checks only, no network)
 *        npm run verify:study -- --only investigations/one-by-one   (one file and its sources)
 */
import { readdir, readFile } from "node:fs/promises";
import {
  containsQuotation,
  loadChurchPage,
  locate,
  normalize,
  pageText,
  paragraphRange,
  paragraphText,
} from "./lib/sources.mjs";

const offline = process.argv.includes("--offline");
/** --only <text>: check only content files whose path contains <text> (and the sources they declare). */
const onlyIndex = process.argv.indexOf("--only");
const only = onlyIndex >= 0 ? process.argv[onlyIndex + 1] : null;
const root = new URL("../src/content/", import.meta.url);

async function readJsonDir(dir) {
  const names = (await readdir(new URL(dir, root))).filter((name) => name.endsWith(".json"));
  return Promise.all(
    names.map(async (name) => ({ file: `${dir}${name}`, data: JSON.parse(await readFile(new URL(`${dir}${name}`, root), "utf8")) })),
  );
}

const files = [
  ...(await readJsonDir("investigations/")),
  ...(await readJsonDir("attributes/")),
  ...(await readJsonDir("passages/")),
  ...(await readJsonDir("connect/")),
].filter(({ file, data }) => !data.placeholder && (!only || file.includes(only)));

/** Sources declared in a content file (Connect sessions declare them per session). */
const fileSources = ({ data }) => (Array.isArray(data.sessions) ? data.sessions.flatMap((s) => s.sources ?? []) : (data.sources ?? []));

const sources = new Map();
for (const file of files) for (const source of fileSources(file)) if (!sources.has(source.id)) sources.set(source.id, source);

let failures = 0;
const manual = [];
const fail = (line) => {
  failures++;
  console.log(`FAIL  ${line}`);
};
const ok = (line) => console.log(`ok    ${line}`);

// --- Sources -------------------------------------------------------------------

async function verifySource(source) {
  const { url, host, uri, lang, highlight } = locate(source.url);
  if (host === "www.churchofjesuschrist.org") {
    if (!url.pathname.startsWith("/study/")) return "Church links must start with /study/";
    const page = await loadChurchPage(uri, lang);
    const canonical = page?.meta?.canonicalUrl?.split("?")[0];
    if (canonical !== uri) return `page not found (service resolved to ${canonical ?? "nothing"})`;

    const scripture = /^(.+ \d+):(\d+)(?:–(\d+))?$/.exec(source.label);
    if (source.kind === "scripture" && scripture) {
      const [, chapter, first, last] = scripture;
      const title = String(page.meta.title).replace(/\s+/g, " ");
      if (title !== chapter) return `label says "${chapter}" but page is "${title}"`;
      const expected = last ? `p${first}-p${last}` : `p${first}`;
      if (highlight !== expected) return `label verses need id=${expected}, URL has id=${highlight ?? "(none)"}`;
    }
    if (highlight) {
      const ids = paragraphRange(highlight);
      if (!ids) return `unrecognized paragraph id "${highlight}"`;
      const missing = ids.filter((id) => paragraphText(page, id) === null);
      if (missing.length) return `paragraphs not on page: ${missing.join(", ")}`;
      if (url.hash && url.hash !== `#${ids[0]}`) return `anchor should be #${ids[0]}`;
    }
    for (const verse of source.verses ?? []) {
      const original = paragraphText(page, `p${verse.number}`);
      if (original === null) return `verse ${verse.number} isn't on the page`;
      if (normalize(original) !== normalize(verse.text)) return `verse ${verse.number} differs from the original:\n        original: ${original}`;
    }
    if (source.verses && highlight) {
      const ids = new Set(paragraphRange(highlight));
      const outside = source.verses.filter((verse) => !ids.has(`p${verse.number}`));
      if (outside.length) return `verses ${outside.map((v) => v.number).join(", ")} are outside the linked range`;
    }
  } else if (host === "speeches.byu.edu") {
    await pageText(source.url); // must load
  } else {
    // Other hosts (e.g. the Church's abuse-help site, which renders in the browser): the link must open,
    // but its content can't be checked, so excerpts aren't allowed and it's listed for manual review.
    if (source.excerpt) return "excerpts can only be verified from Church content or BYU Speeches";
    const response = await fetch(source.url, { headers: { "User-Agent": "GospelLabs-reference-check" }, redirect: "follow" });
    if (!response.ok) return `link answered HTTP ${response.status}`;
    manual.push(`${source.id}: ${source.url} (link opens: HTTP ${response.status}; content not checked automatically)`);
    return null;
  }
  if (source.excerpt) {
    const text = await pageText(source.url);
    if (!containsQuotation(text, source.excerpt)) return `excerpt not found in the source: “${source.excerpt}”`;
  }
  return null;
}

// --- Quotations ----------------------------------------------------------------

/** Every string in a content object that could contain a quotation (not verse text, excerpts, URLs, or learner questions). */
function texts(value, path = []) {
  if (typeof value === "string") return [{ path: path.join("."), text: value }];
  if (Array.isArray(value)) return value.flatMap((item, i) => texts(item, [...path, i]));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, inner]) =>
      ["verses", "excerpt", "url", "sources"].includes(key) ? [] : texts(inner, [...path, key]),
    );
  }
  return [];
}

async function sourceText(source) {
  const parts = [];
  if (source.verses) parts.push(...source.verses.map((verse) => verse.text));
  if (source.excerpt) parts.push(source.excerpt);
  if (!offline) {
    const { host, uri, lang, highlight } = locate(source.url);
    if (host === "www.churchofjesuschrist.org" && source.kind === "scripture" && highlight) {
      const page = await loadChurchPage(uri, lang);
      for (const id of paragraphRange(highlight) ?? []) parts.push(paragraphText(page, id) ?? "");
    } else if (host === "www.churchofjesuschrist.org" || host === "speeches.byu.edu") {
      parts.push(await pageText(source.url));
    }
  }
  return parts.join("\n");
}

// --- Run --------------------------------------------------------------------------

console.log(`Sources (${sources.size}):`);
if (offline) console.log("  skipped (--offline)");
else {
  for (const source of sources.values()) {
    let problem;
    try {
      problem = await verifySource(source);
    } catch (error) {
      problem = error instanceof Error ? error.message : String(error);
    }
    if (problem) fail(`${source.id.padEnd(40)} ${source.label}\n      ${source.url}\n      → ${problem}`);
    else ok(`${source.id.padEnd(40)} ${source.label}`);
  }
}

let quotationCount = 0;
for (const file of files) {
  const declared = fileSources(file);
  const quotations = [];
  for (const { path, text } of texts(file.data)) {
    for (const match of text.matchAll(/“([^”]+)”/g)) quotations.push({ path, quotation: match[1] });
  }
  if (!quotations.length) continue;
  console.log(`\nQuotations in ${file.file} (${quotations.length}):`);
  const haystack = (await Promise.all(declared.map((source) => sourceText(source).catch(() => "")))).join("\n");
  for (const { path, quotation } of quotations) {
    quotationCount++;
    if (containsQuotation(haystack, quotation)) ok(`“${quotation}”`);
    else fail(`“${quotation}”\n      at ${path}\n      → not found in the sources this file declares`);
  }
}

// Privacy: no survey response (or any 7-word run from one) may appear in content.
try {
  const dataset = JSON.parse(await readFile(new URL("../data/private/learner-questions.json", import.meta.url), "utf8"));
  const squash = (text) => text.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
  const windows = new Set();
  for (const { text } of dataset.responses) {
    const words = squash(text).split(" ");
    if (words.length >= 4 && squash(text).length >= 22) windows.add(squash(text));
    for (let i = 0; i + 7 <= words.length; i++) windows.add(words.slice(i, i + 7).join(" "));
  }
  console.log("\nPrivacy (no survey text in content):");
  let leaks = 0;
  for (const file of files) {
    const haystack = squash(JSON.stringify(file.data).replace(/\\n/g, " "));
    for (const window of windows) {
      if (window.length >= 22 && haystack.includes(window)) {
        leaks++;
        fail(`${file.file} contains survey text: “${window}”`);
      }
    }
  }
  if (!leaks) ok(`no survey text in ${files.length} content files`);
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
  console.log("\nPrivacy: data/private/learner-questions.json not found; skipped (run npm run learner-questions).");
}

if (manual.length) console.log(`\nNeeds manual verification (${manual.length}):\n  ${manual.join("\n  ")}`);
console.log(`\n${sources.size} sources, ${quotationCount} quotations, ${failures} failure${failures === 1 ? "" : "s"}.`);
process.exit(failures ? 1 : 0);
