#!/usr/bin/env node
/**
 * Content-authoring helper: prints exact text from original sources, so
 * verse text and quotations are copied rather than typed from memory.
 *
 *   node scripts/scripture.mjs verses "<scripture URL with id=pX-pY>"
 *       → JSON verses [{ "number", "text" }] ready to paste into a source.
 *   node scripts/scripture.mjs text "<any source URL>"
 *       → the page's plain text (Church content service or other HTML, e.g. speeches.byu.edu).
 *   node scripts/scripture.mjs find "<any source URL>" "<quotation>"
 *       → whether the quotation appears in the page, word for word.
 *   node scripts/scripture.mjs title "<Church URL>"
 *       → the page title and canonical URL the content service resolves (to check a link).
 *
 * Requires network access. Never used by the app.
 */
import { containsQuotation, loadChurchPage, locate, pageText, scriptureVerses } from "./lib/sources.mjs";

const [command, url, quotation] = process.argv.slice(2);
if (!command || !url) {
  console.error("Usage: node scripts/scripture.mjs verses|text|find|title <url> [quotation]");
  process.exit(1);
}

switch (command) {
  case "verses":
    console.log(JSON.stringify(await scriptureVerses(url), null, 2));
    break;
  case "text":
    console.log((await pageText(url)).replace(/\n\s*\n+/g, "\n\n"));
    break;
  case "find": {
    const found = containsQuotation(await pageText(url), quotation ?? "");
    console.log(found ? "FOUND" : "NOT FOUND");
    process.exit(found ? 0 : 1);
    break;
  }
  case "title": {
    const { uri, lang } = locate(url);
    const page = await loadChurchPage(uri, lang);
    console.log(JSON.stringify({ title: page?.meta?.title ?? null, canonicalUrl: page?.meta?.canonicalUrl ?? null, requested: uri }, null, 2));
    break;
  }
  default:
    console.error(`Unknown command "${command}"`);
    process.exit(1);
}
