#!/usr/bin/env node
/**
 * Serves the static export in out/ the way Caddy serves it on Atlas: /library
 * finds library.html, unknown paths get 404.html, and /sw.js is never cached.
 * `next start` doesn't work with `output: "export"`, so `npm start` and the
 * end-to-end tests use this instead. Run `npm run build` first.
 *
 * Usage: node scripts/serve-out.mjs [port]   (default 3000)
 *
 * The security headers (Content-Security-Policy and others) are set only by
 * Caddy on Atlas, so they aren't applied here.
 */
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..", "out");
const port = Number(process.argv[2] ?? process.env.PORT ?? 3000);

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

/** The file for a URL path: exact match, then .html, then a folder's index.html. */
function findFile(pathname) {
  // normalize() on an absolute path drops any "..", so the result stays inside out/.
  const base = join(root, normalize(pathname));
  for (const candidate of [base, `${base}.html`, join(base, "index.html")]) {
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      // Not there; try the next candidate.
    }
  }
  return null;
}

try {
  statSync(join(root, "index.html"));
} catch {
  console.error("out/ has no build. Run `npm run build` first.");
  process.exit(1);
}

createServer((request, response) => {
  const { pathname } = new URL(request.url ?? "/", "http://localhost");
  let file = null;
  try {
    file = findFile(decodeURIComponent(pathname));
  } catch {
    // Malformed escape sequence: treat as not found.
  }
  const status = file ? 200 : 404;
  file ??= join(root, "404.html");
  response.writeHead(status, {
    "Content-Type": CONTENT_TYPES[extname(file)] ?? "application/octet-stream",
    ...(pathname === "/sw.js" ? { "Cache-Control": "no-cache" } : {}),
  });
  if (request.method === "HEAD") return response.end();
  createReadStream(file).pipe(response);
}).listen(port, () => console.log(`Serving out/ at http://localhost:${port}`));
