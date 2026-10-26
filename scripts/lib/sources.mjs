/**
 * Shared helpers for reading original sources: the content service behind
 * the Church's Gospel Library website (scriptures, Guide to the Scriptures,
 * Bible Dictionary, Gospel Topics, manuals, General Conference), and BYU
 * Speeches pages. Used only by developer scripts; never by the app.
 */

const CONTENT_API = "https://www.churchofjesuschrist.org/study/api/v3/language-pages/type/content";
const USER_AGENT = "GospelLabs-reference-check";
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

const cache = new Map();

async function fetchWithRetry(url, options, attempts = 3) {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.status >= 500 && attempt < attempts) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (error) {
      if (attempt >= attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
}

/** A page from the Church content service: { meta, content: { body, footnotes } }. */
export function loadChurchPage(uri, lang = "eng") {
  const key = `church:${lang}:${uri}`;
  if (!cache.has(key)) {
    const params = new URLSearchParams({ lang, uri });
    cache.set(
      key,
      fetchWithRetry(`${CONTENT_API}?${params}`, { headers: { "User-Agent": USER_AGENT } }).then(async (res) => {
        if (!res.ok) throw new Error(`content service returned HTTP ${res.status}`);
        return res.json();
      }),
    );
  }
  return cache.get(key);
}

/** The HTML of any other page (e.g. speeches.byu.edu). */
export function loadHtml(url) {
  const key = `html:${url}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      fetchWithRetry(url, { headers: { "User-Agent": USER_AGENT }, redirect: "follow" }).then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      }),
    );
  }
  return cache.get(key);
}

export function plainText(html) {
  return html
    .replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<sup[^>]*>[\s\S]*?<\/sup>/g, "") // footnote markers
    .replace(/<span[^>]*class="verse-number"[^>]*>[\s\S]*?<\/span>/g, "") // verse numbers
    .replace(/<\/(p|div|li|h\d)>|<br\s*\/?>/gi, "\n")
    // Tags wrap words (footnote links) without separating them, so they're removed, not replaced with spaces.
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (entity, name) =>
      name.startsWith("#")
        ? String.fromCodePoint(Number.parseInt(name.slice(name[1] === "x" ? 2 : 1), name[1] === "x" ? 16 : 10))
        : (ENTITIES[name] ?? entity),
    );
}

/** Lowercased, with straight quotes, plain hyphens/dashes normalized, and single spaces, so comparisons ignore typography. */
export const normalize = (text) =>
  text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[   ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

export function paragraphRange(id) {
  const match = /^p(\d+)(?:-p(\d+))?$/.exec(id ?? "");
  if (!match) return null;
  const start = Number(match[1]);
  const end = Number(match[2] ?? match[1]);
  return Array.from({ length: end - start + 1 }, (_, i) => `p${start + i}`);
}

export function locate(url) {
  const parsed = new URL(url);
  return {
    url: parsed,
    host: parsed.hostname,
    uri: parsed.pathname.replace(/^\/study/, ""),
    lang: parsed.searchParams.get("lang") ?? "eng",
    highlight: parsed.searchParams.get("id"),
  };
}

/** Text of one paragraph (verse) of a Church page, without footnote markers or the verse number. */
export function paragraphText(page, id) {
  const body = page.content?.body ?? "";
  const match = new RegExp(`<p[^>]*id="${id}"[^>]*>([\\s\\S]*?)</p>`).exec(body);
  return match ? plainText(match[1]).replace(/\s+/g, " ").trim() : null;
}

/** Verses [{ number, text }] for a scripture URL with id=pX or id=pX-pY. */
export async function scriptureVerses(url) {
  const { uri, lang, highlight } = locate(url);
  const page = await loadChurchPage(uri, lang);
  const ids = paragraphRange(highlight);
  if (!ids) throw new Error("URL needs id=pX or id=pX-pY to select verses");
  return ids.map((id) => ({ number: Number(id.slice(1)), text: paragraphText(page, id) }));
}

/** All readable text of a source page (Church content or other HTML), for finding excerpts and quotations. */
export async function pageText(url) {
  const { host, uri, lang } = locate(url);
  if (host === "www.churchofjesuschrist.org") {
    const page = await loadChurchPage(uri, lang);
    const footnotes = Object.values(page.content?.footnotes ?? {}).map((note) => note.text ?? "");
    return [plainText(page.content?.body ?? ""), ...footnotes.map(plainText)].join("\n");
  }
  return plainText(await loadHtml(url));
}

/**
 * True if `quotation` appears in `haystack` (both normalized). Ellipses
 * ("…" or ". . .") and bracketed editorial insertions ("[his]") split the
 * quotation into parts that must appear in order.
 */
export function containsQuotation(haystack, quotation) {
  const source = normalize(haystack);
  const parts = quotation
    .split(/\s*(?:…|\.\s\.\s\.|\[[^\]]*\])\s*/)
    .map((part) => normalize(part).replace(/^[,.;:!?]+|[,.;:!?]+$/g, "").trim())
    .filter(Boolean);
  let from = 0;
  for (const part of parts) {
    const index = source.indexOf(part, from);
    if (index < 0) return false;
    from = index + part.length;
  }
  return parts.length > 0;
}
