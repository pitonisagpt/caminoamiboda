// Post-`vite build` step: visits every real public URL against the
// freshly-built app with headless Chromium, waits for the page's real
// content to render, and writes the resulting HTML to dist/<path>.html.
// Cloudflare's static-assets binding then serves that file directly for an
// exact-path match instead of falling back to the generic SPA shell — see
// docs/desarrollo/seo-prerendering-plan.md for the full write-up and the
// two risks this was spiked against before being built.
//
// `dist/<path>.html` (not `dist/<path>/index.html`) is deliberate: spiked
// locally via `wrangler dev` against both conventions — a `path.html` file
// is served directly at the canonical no-trailing-slash URL with a plain
// 200, while a `path/index.html` file forces a 307 redirect to add the
// trailing slash. Every URL in the sitemap (and "/") is trailing-slash-free,
// so `.html` avoids an extra redirect hop for every single page.
//
// "/" itself is intentionally prerendered even though it's NOT in the
// sitemap — App.tsx mounts CatalogPage at "/" directly (not a redirect,
// see App.tsx's comment), and HreflangTags always points its canonical at
// /catalogo regardless of which path rendered it, so prerendering "/"
// produces correct output. This does mean dist/index.html (the prerendered
// homepage) is also what Cloudflare's `not_found_handling:
// "single-page-application"` fallback serves as the very first paint for
// any genuinely unmatched route (e.g. a hard-loaded /admin URL) — harmless
// since this repo doesn't hydrate (main.tsx does a plain createRoot().
// render(), confirmed no hydration-mismatch risk), so the client bundle
// just wipes and replaces it once it boots, same as it does today with the
// generic shell.

import { preview } from "vite";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, "..", "dist");
const PREVIEW_PORT = 4173;
const SITE_ORIGIN = `http://localhost:${PREVIEW_PORT}`;
// Same production backend the built app itself talks to (see
// wrangler.jsonc's API_BASE_URL) — prerendering needs it reachable and
// correct regardless of where the URL list comes from, since each page's
// real content is fetched from it too. Overridable for local testing
// against a different backend.
const API_BASE_URL = process.env.PRERENDER_API_BASE_URL || "https://api.caminoamiboda.com";
const READY_TIMEOUT_MS = 10_000;
const DEFAULT_TITLE = "Camino a mi Boda";

async function fetchSitemapPaths() {
  const res = await fetch(`${API_BASE_URL}/sitemap.xml`);
  if (!res.ok) {
    throw new Error(`Failed to fetch sitemap: ${res.status} ${res.statusText}`);
  }
  const xml = await res.text();
  const paths = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  // "/" isn't in the sitemap by design (canonicalizes to /catalogo, see
  // module comment above) but is a real URL that needs its own prerendered
  // file — added explicitly, de-duped just in case that ever changes.
  return [...new Set(["/", ...paths])];
}

function pathToOutputFile(urlPath) {
  const clean = urlPath.replace(/^\/+/, "").replace(/\/+$/, "");
  return clean === "" ? "index.html" : `${clean}.html`;
}

async function prerenderPath(context, urlPath) {
  const page = await context.newPage();
  try {
    await page.goto(`${SITE_ORIGIN}${urlPath}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    // Every real page sets its own <title> via Helmet once its data has
    // loaded (see CatalogPage.tsx/VehicleDetailPage.tsx/etc.) — waiting for
    // it to move off the static index.html default is a simple, generic
    // "real content is in" signal that works across every page type
    // without needing per-page-type loading-state knowledge.
    await page
      .waitForFunction((defaultTitle) => document.title !== defaultTitle, DEFAULT_TITLE, {
        timeout: READY_TIMEOUT_MS,
      })
      .catch(() => {
        console.warn(`  [warn] ${urlPath}: title never changed from default within ${READY_TIMEOUT_MS}ms, capturing anyway`);
      });
    // Best-effort extra settle time for images/lazy content — not required
    // for correct SEO text, so a timeout here is not worth warning about.
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});

    const html = await page.evaluate(() => "<!doctype html>\n" + document.documentElement.outerHTML);
    return { urlPath, html, ok: true };
  } catch (err) {
    console.error(`  [fail] ${urlPath}: ${err.message}`);
    return { urlPath, ok: false };
  } finally {
    await page.close();
  }
}

async function main() {
  console.log(`Fetching sitemap from ${API_BASE_URL}/sitemap.xml ...`);
  const urlPaths = await fetchSitemapPaths();
  console.log(`${urlPaths.length} URLs to prerender.`);

  console.log(`Starting vite preview on port ${PREVIEW_PORT} ...`);
  const server = await preview({ preview: { port: PREVIEW_PORT, strictPort: true } });

  // --disable-web-security: the built bundle's baseURL (VITE_API_BASE_URL,
  // set as a Cloudflare Workers Build env var) is baked in as the ABSOLUTE
  // production API URL, so every request from this localhost preview page
  // is cross-origin against the real backend — and the backend's CORS
  // allowlist only permits caminoamiboda.com, not this local preview
  // origin (confirmed: axios is configured with withCredentials: true, so
  // this can't be worked around by widening the production CORS allowlist
  // without a real security regression). This flag is scoped to this
  // throwaway Playwright-launched browser instance only — it never touches
  // the production backend's actual CORS policy, which stays untouched.
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-web-security"] });
  const context = await browser.newContext({ locale: "es-CO" });

  const results = [];
  for (const urlPath of urlPaths) {
    const result = await prerenderPath(context, urlPath);
    results.push(result);
  }

  await browser.close();
  await new Promise((resolve, reject) => {
    server.httpServer.close((err) => (err ? reject(err) : resolve()));
  });

  const succeeded = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  for (const { urlPath, html } of succeeded) {
    const outFile = path.join(DIST_DIR, pathToOutputFile(urlPath));
    await mkdir(path.dirname(outFile), { recursive: true });
    await writeFile(outFile, html, "utf8");
  }

  console.log(`Prerendered ${succeeded.length}/${urlPaths.length} pages.`);
  if (failed.length > 0) {
    console.warn(`Skipped (left as plain SPA fallback): ${failed.map((r) => r.urlPath).join(", ")}`);
  }
}

main().catch((err) => {
  console.error("Prerendering failed:", err);
  process.exit(1);
});
