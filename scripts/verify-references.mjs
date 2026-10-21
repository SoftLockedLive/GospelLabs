#!/usr/bin/env node
/**
 * Verifies every reference URL in the question bank and the discovery trails
 * against the content service used by the Gospel Library website, and checks
 * that every quotation in a discovery trail appears in the passages it cites.
 *
 * A URL passes when:
 *   1. it points to https://www.churchofjesuschrist.org/study/...,
 *   2. the service resolves that exact page (its canonical URL matches,
 *      rather than falling back to a parent book or collection), and
 *   3. any highlighted paragraphs in `id=pX` or `id=pX-pY` exist on the page.
 *
 * A quotation is any text inside curly double quotes (“…”) in a trail. It
 * passes when it appears word for word, ignoring capitalization and trailing
 * punctuation, in the verses (or those verses' footnotes) of the trail's
 * references. Single curly quotes (‘…’) mark a word being discussed and
 * aren't checked.
 *
 * This confirms that links open the intended verses and that quotations are
 * real. It does not, and cannot, confirm that a source supports any
 * particular conclusion.
 *
 * Usage: npm run verify:references
 * Requires network access. Exits non-zero if anything fails.
 */
import { readFile } from "node:fs/promises";

const CONTENT_API = "https://www.churchofjesuschrist.org/study/api/v3/language-pages/type/content";
const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const bank = await readJson("../src/data/question-bank.json");
const { trails } = await readJson("../src/data/discovery-trails.json");

const references = [
  ...bank.questions.flatMap((q) => (q.suggestedReferences ?? []).map((r) => ({ source: q.id, ...r }))),
  ...trails.flatMap((trail) =>
    trail.steps.flatMap((step) => (step.references ?? []).map((r) => ({ source: `${trail.id}/${step.id}`, ...r }))),
  ),
].filter((reference) => reference.url);

const cache = new Map();
async function loadPage(uri, lang) {
  const key = `${lang}:${uri}`;
  if (!cache.has(key)) {
    const params = new URLSearchParams({ lang, uri });
    cache.set(
      key,
      fetch(`${CONTENT_API}?${params}`, { headers: { "User-Agent": "GospelLabs-reference-check" } }).then(
        async (res) => {
          if (!res.ok) throw new Error(`content service returned HTTP ${res.status}`);
          return res.json();
        },
      ),
    );
  }
  return cache.get(key);
}

function paragraphRange(id) {
  const match = /^p(\d+)(?:-p(\d+))?$/.exec(id);
  if (!match) return null;
  const start = Number(match[1]);
  const end = Number(match[2] ?? match[1]);
  return Array.from({ length: end - start + 1 }, (_, i) => `p${start + i}`);
}

function locate(reference) {
  const url = new URL(reference.url);
  return {
    url,
    uri: url.pathname.slice("/study".length),
    lang: url.searchParams.get("lang") ?? "eng",
    highlight: url.searchParams.get("id"),
  };
}

async function verify(ref) {
  const { url, uri, lang, highlight } = locate(ref);
  if (url.protocol !== "https:" || url.hostname !== "www.churchofjesuschrist.org") {
    return "must use https://www.churchofjesuschrist.org";
  }
  if (!url.pathname.startsWith("/study/")) return "path must start with /study/";

  const page = await loadPage(uri, lang);
  const canonical = page?.meta?.canonicalUrl?.split("?")[0];
  if (canonical !== uri) return `page not found (service resolved to ${canonical ?? "nothing"})`;

  // For scripture labels like "Alma 7:11–13", the page title must be "Alma 7"
  // and the highlighted paragraphs must be p11-p13.
  const scripture = /^(.+ \d+):(\d+)(?:–(\d+))?$/.exec(ref.label);
  if (ref.type === "scripture" && scripture) {
    const [, chapter, first, last] = scripture;
    // Titles use non-breaking spaces in numbered books ("2 Nephi").
    const title = String(page.meta.title).replace(/\s+/g, " ");
    if (title !== chapter) return `label says "${chapter}" but page is "${title}"`;
    const expected = last ? `p${first}-p${last}` : `p${first}`;
    if (highlight !== expected) return `label verses need id=${expected}, URL has id=${highlight ?? "(none)"}`;
  }

  if (highlight) {
    const ids = paragraphRange(highlight);
    if (!ids) return `unrecognized paragraph id "${highlight}"`;
    const body = page.content?.body ?? "";
    const missing = ids.filter((id) => !body.includes(`id="${id}"`));
    if (missing.length) return `paragraphs not on page: ${missing.join(", ")}`;
    if (url.hash && url.hash !== `#${ids[0]}`) return `anchor should be #${ids[0]}`;
  }
  return null;
}

// --- Quotations -----------------------------------------------------------

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function plainText(html) {
  return html
    .replace(/<sup[^>]*>[\s\S]*?<\/sup>/g, "") // footnote markers
    .replace(/<span[^>]*class="verse-number"[^>]*>[\s\S]*?<\/span>/g, "") // verse numbers
    // Tags wrap words (footnote links) without separating them, so they're removed, not replaced with spaces.
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (entity, name) =>
      name.startsWith("#")
        ? String.fromCodePoint(Number.parseInt(name.slice(name[1] === "x" ? 2 : 1), name[1] === "x" ? 16 : 10))
        : (ENTITIES[name] ?? entity),
    );
}

/** Lowercased, with straight quotes and single spaces, so comparisons ignore typography. */
const normalize = (text) =>
  text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/** The text of a reference's verses, plus those verses' footnotes. */
async function passageText(reference) {
  const { uri, lang, highlight } = locate(reference);
  const page = await loadPage(uri, lang);
  const body = page.content?.body ?? "";
  const ids = highlight ? paragraphRange(highlight) ?? [] : [];
  const verses = ids.map((id) => new RegExp(`<p[^>]*id="${id}"[^>]*>([\\s\\S]*?)</p>`).exec(body)?.[1] ?? "");
  const verseNumbers = new Set(ids.map((id) => id.slice(1)));
  const footnotes = Object.entries(page.content?.footnotes ?? {})
    .filter(([key]) => verseNumbers.has(/^note(\d+)_/.exec(key)?.[1]))
    .map(([, note]) => note.text ?? "");
  return [...verses, ...footnotes].map(plainText).join(" ");
}

/** Every piece of text in a trail that could contain a quotation. */
function trailTexts(trail) {
  return [
    trail.title,
    trail.introduction ?? "",
    ...trail.steps.flatMap((step) => [
      step.title,
      step.question,
      ...(step.stated ?? []),
      ...(step.interpretation ?? []),
      ...(step.reflection ?? []),
      ...(step.connections ?? []).map((connection) => connection.note),
    ]),
  ];
}

async function checkQuotations(trail) {
  const passages = await Promise.all(
    trail.steps.flatMap((step) => (step.references ?? []).filter((r) => r.url).map(passageText)),
  );
  const source = normalize(passages.join(" "));
  const quotations = [...new Set(trailTexts(trail).flatMap((text) => [...text.matchAll(/“([^”]+)”/g)].map((m) => m[1])))];
  return quotations.map((quotation) => {
    const needle = normalize(quotation).replace(/[,.;:]+$/, "");
    return { quotation, ok: source.includes(needle) };
  });
}

// --- Run ------------------------------------------------------------------

let failures = 0;
for (const ref of references) {
  let problem;
  try {
    problem = await verify(ref);
  } catch (error) {
    problem = error instanceof Error ? error.message : String(error);
  }
  if (problem) failures++;
  console.log(`${problem ? "FAIL" : "ok  "}  ${ref.source.padEnd(32)} ${ref.label}${problem ? `\n      ${ref.url}\n      → ${problem}` : ""}`);
}
console.log(`\n${references.length - failures}/${references.length} reference URLs verified.`);

let quotationCount = 0;
let quotationFailures = 0;
for (const trail of trails) {
  let results;
  try {
    results = await checkQuotations(trail);
  } catch (error) {
    results = [{ quotation: "(couldn't load passages)", ok: false, error }];
  }
  console.log(`\nQuotations in trail "${trail.id}":`);
  for (const { quotation, ok } of results) {
    quotationCount++;
    if (!ok) quotationFailures++;
    console.log(`${ok ? "ok  " : "FAIL"}  “${quotation}”${ok ? "" : "\n      → not found in this trail's cited verses or their footnotes"}`);
  }
}
console.log(`\n${quotationCount - quotationFailures}/${quotationCount} trail quotations found in their sources.`);

process.exit(failures || quotationFailures ? 1 : 0);
