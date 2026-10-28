/*
 * Gospel Labs service worker.
 *
 * Caches the app shell (pages and the static files they need) so the app
 * opens and works offline, including every guided investigation, Scripture
 * Explorer passage, and Character of Christ attribute page. Personal study
 * data (research notebooks, progress, Discovery Cards, the Map) is stored in
 * IndexedDB, not here.
 *
 * Only same-origin GET requests are handled. Requests to other sites, such as
 * ChurchofJesusChrist.org, are never intercepted or cached, so external
 * resources are only available when the device is online.
 *
 * The version comes from the registration URL (/sw.js?v=<build>), so every
 * deployment installs a fresh worker and discards the previous caches.
 */
const VERSION = new URL(self.location.href).searchParams.get("v") || "unversioned";
const PREFIX = "gospel-labs-";
const PAGES_CACHE = `${PREFIX}pages-${VERSION}`;
const ASSETS_CACHE = `${PREFIX}assets-${VERSION}`;

/**
 * Pages that make up the app shell. Pages for personal records (research
 * notebooks, Discovery Cards, Map nodes) read their id from the query string
 * in the browser, so one cached page serves them all.
 */
const SHELL_PAGES = [
  "/",
  "/investigate",
  "/explore",
  "/character",
  "/connect",
  "/notebook",
  "/map",
  "/questions",
  "/library",
  "/settings",
  "/settings/appearance",
  "/settings/study",
  "/settings/data",
  "/settings/privacy",
  "/settings/feedback",
  "/settings/about",
  "/investigations/new",
  "/investigations/view",
  "/offline",
];

/**
 * Content detail pages are found in their list page's links and cached too:
 * /questions/<id>, /investigate/<id>, /explore/<id>, /character/<id>.
 */
const DETAIL_PAGES = [
  { list: "/questions", prefix: "/questions/" },
  { list: "/investigate", prefix: "/investigate/" },
  { list: "/explore", prefix: "/explore/" },
  { list: "/character", prefix: "/character/" },
];
const SHELL_FILES = ["/manifest.webmanifest", "/icon.svg", "/apple-icon.png", "/icons/icon-192.png", "/icons/icon-512.png"];
const NETWORK_TIMEOUT_MS = 4000;

/** Pages are cached without their query string: /investigations/view?id=… shares one entry. */
const pageKey = (url) => new URL(url, self.location.origin).pathname;

/**
 * Static asset URLs in a page's HTML: build files, and the paintings a page
 * shows (/art/…; only the first file of a srcset follows a quote, so the
 * smaller one is cached ahead and the larger the first time it's used).
 * Pages also embed URLs in escaped JSON (\"/_next/static/…\"), so a
 * backslash ends a URL too; otherwise it's kept and the request 404s.
 */
function staticAssetsIn(html) {
  const urls = new Set();
  for (const match of html.matchAll(/["'(](\/(?:_next\/static|art)\/[^"')\s\\]+)/g)) urls.add(match[1].replace(/&amp;/g, "&"));
  return [...urls];
}

/** Links in a list page's HTML to its detail pages, e.g. href="/explore/the-prodigal-son". */
function detailPagesIn(html, prefix) {
  const urls = new Set();
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  for (const match of html.matchAll(new RegExp(`href="(${escaped}[a-z0-9-]+)"`, "g"))) urls.add(match[1]);
  return [...urls];
}

async function cachePage(path, pages, assets) {
  const response = await fetch(path, { cache: "reload" });
  if (!response.ok) return "";
  const html = await response.clone().text();
  await pages.put(pageKey(path), response);
  await Promise.allSettled(staticAssetsIn(html).map((asset) => assets.add(asset)));
  return html;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const [pages, assets] = await Promise.all([caches.open(PAGES_CACHE), caches.open(ASSETS_CACHE)]);
      // Best effort: anything missed here is cached the first time it's used.
      const results = await Promise.allSettled(SHELL_PAGES.map((path) => cachePage(path, pages, assets)));
      const details = DETAIL_PAGES.flatMap(({ list, prefix }) => {
        const listHtml = results[SHELL_PAGES.indexOf(list)];
        return listHtml && listHtml.status === "fulfilled" ? detailPagesIn(listHtml.value, prefix) : [];
      });
      await Promise.allSettled([...new Set(details)].map((path) => cachePage(path, pages, assets)));
      await Promise.allSettled(SHELL_FILES.map((file) => assets.add(file)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith(PREFIX) && name !== PAGES_CACHE && name !== ASSETS_CACHE)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);
}

/** Pages: try the network first so updates appear; fall back to the cached copy offline. */
async function handleNavigation(request) {
  const pages = await caches.open(PAGES_CACHE);
  try {
    const response = await withTimeout(fetch(request), NETWORK_TIMEOUT_MS);
    if (response.ok && response.type === "basic") await pages.put(pageKey(request.url), response.clone());
    return response;
  } catch {
    const cached = (await pages.match(pageKey(request.url))) || (await pages.match("/offline"));
    return (
      cached ||
      new Response("You're offline, and this page isn't available offline yet.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}

/** Build assets have content hashes in their names, so a cached copy is always correct. */
async function handleImmutableAsset(request) {
  const assets = await caches.open(ASSETS_CACHE);
  const cached = await assets.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await assets.put(request, response.clone());
  return response;
}

/** Icons, paintings, and the manifest: serve from cache, refresh in the background. */
async function handleStaticFile(request) {
  const assets = await caches.open(ASSETS_CACHE);
  const cached = await assets.match(request);
  const refresh = fetch(request)
    .then(async (response) => {
      if (response.ok) await assets.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || refresh;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never touch other sites

  // The deployed build's identifier must always come from the server, never a cache.
  if (url.pathname === "/version.json") return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(handleImmutableAsset(request));
  } else if (request.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) {
    // Client-side navigation data: network only. When offline, Next.js falls
    // back to a full page load, which is served from the page cache above.
    return;
  } else if (SHELL_FILES.includes(url.pathname) || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/art/")) {
    event.respondWith(handleStaticFile(request));
  }
});
