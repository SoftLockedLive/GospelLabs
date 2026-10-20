#!/usr/bin/env node
/**
 * Verifies every suggested-reference URL in the question bank against the
 * content service used by the Gospel Library website.
 *
 * A URL passes when:
 *   1. it points to https://www.churchofjesuschrist.org/study/...,
 *   2. the service resolves that exact page (its canonical URL matches,
 *      rather than falling back to a parent book or collection), and
 *   3. any highlighted paragraphs in `id=pX` or `id=pX-pY` exist on the page.
 *
 * This confirms a link opens the intended page and verses. It does not, and
 * cannot, confirm that a source supports any particular conclusion.
 *
 * Usage: npm run verify:references [-- path/to/question-bank.json]
 * Requires network access. Exits non-zero if any URL fails.
 */
import { readFile } from "node:fs/promises";

const CONTENT_API = "https://www.churchofjesuschrist.org/study/api/v3/language-pages/type/content";
const file = process.argv[2] ?? new URL("../src/data/question-bank.json", import.meta.url);
const bank = JSON.parse(await readFile(file, "utf8"));

const references = bank.questions.flatMap((q) =>
  (q.suggestedReferences ?? []).filter((r) => r.url).map((r) => ({ questionId: q.id, ...r })),
);

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

async function verify(ref) {
  const url = new URL(ref.url);
  if (url.protocol !== "https:" || url.hostname !== "www.churchofjesuschrist.org") {
    return "must use https://www.churchofjesuschrist.org";
  }
  if (!url.pathname.startsWith("/study/")) return "path must start with /study/";
  const uri = url.pathname.slice("/study".length);
  const lang = url.searchParams.get("lang") ?? "eng";

  const page = await loadPage(uri, lang);
  const canonical = page?.meta?.canonicalUrl?.split("?")[0];
  if (canonical !== uri) return `page not found (service resolved to ${canonical ?? "nothing"})`;

  const highlight = url.searchParams.get("id");

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

let failures = 0;
for (const ref of references) {
  let problem;
  try {
    problem = await verify(ref);
  } catch (error) {
    problem = error instanceof Error ? error.message : String(error);
  }
  if (problem) failures++;
  console.log(`${problem ? "FAIL" : "ok  "}  ${ref.questionId.padEnd(24)} ${ref.label}${problem ? `\n      ${ref.url}\n      → ${problem}` : ""}`);
}

console.log(`\n${references.length - failures}/${references.length} reference URLs verified.`);
process.exit(failures ? 1 : 0);
