/**
 * Cloudflare Worker — injects per-vehicle Open Graph / Twitter Card meta
 * tags into the SPA shell's <head>, but ONLY for requests to /catalogo or
 * /en/catalogo with a ?vehiculo=<id> param AND a known link-preview-bot
 * User-Agent (WhatsApp, Facebook, Twitter, LinkedIn, Slack, Telegram,
 * Discord, Skype, Pinterest, reddit). Every other request — real visitors,
 * any other path, a bot request with no vehiculo param, anything that
 * fails along the way — falls straight through to env.ASSETS.fetch(request),
 * i.e. exactly today's existing plain-SPA behavior, byte-for-byte.
 *
 * Why this exists: WhatsApp/Facebook/Twitter/etc. link-preview crawlers
 * fetch raw HTML and never execute JavaScript, so the react-helmet-async
 * <meta> tags CatalogPage.tsx sets client-side are invisible to them — a
 * crawler only ever sees frontend/index.html's static <head>. This Worker
 * is the mechanism that serves different meta tags per vehicle without
 * introducing SSR/prerendering into what is otherwise a pure static-assets
 * deployment (see wrangler.jsonc).
 *
 * This file is intentionally NOT under tsconfig.json's `include: ["src"]`,
 * so it's never part of `npm run build`'s `tsc` step — the ambient
 * Workers-runtime types below exist to keep this file sane to read/edit,
 * not to satisfy a build gate. Kept local rather than adding the
 * `@cloudflare/workers-types` package for this one file.
 */

// ---------------------------------------------------------------------------
// Ambient Workers-runtime types not covered by tsconfig's DOM lib (Request,
// Response, URL, fetch, AbortController, setTimeout/clearTimeout, console
// all come from the DOM lib already and need no declaration here).
// ---------------------------------------------------------------------------

interface Fetcher {
  fetch(input: Request | string, init?: RequestInit): Promise<Response>;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

interface Env {
  /** The `assets` binding configured in wrangler.jsonc — lets this Worker
   * fall back to (or fetch, then transform) the built SPA's static files. */
  ASSETS: Fetcher;
  /** Backend origin — see wrangler.jsonc's `vars`. */
  API_BASE_URL: string;
}

interface HTMLRewriterElement {
  append(content: string, options?: { html?: boolean }): void;
  setInnerContent(content: string, options?: { html?: boolean }): void;
  remove(): void;
}

declare class HTMLRewriter {
  on(selector: string, handlers: { element?(element: HTMLRewriterElement): void }): HTMLRewriter;
  transform(response: Response): Response;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SITE_URL = "https://caminoamiboda.com";
const SITE_NAME = "Camino a mi Boda";
// The real brand logo, already served at a stable public path — confirmed
// byte-identical (md5) to frontend/src/assets/logo_camino_a_mi_boda.png.
const FALLBACK_IMAGE = `${SITE_URL}/favicon.png`;

// Case-insensitive substring match against the raw User-Agent header. Real
// browsers never contain any of these tokens, so this can never
// accidentally intercept a human visitor.
const BOT_UA_PATTERNS = [
  "whatsapp",
  "facebookexternalhit",
  "facebot",
  "twitterbot",
  "linkedinbot",
  "slackbot",
  "telegrambot",
  "discordbot",
  "skypeuripreview",
  "pinterest",
  "redditbot",
];

// frontend/index.html carries static, generic versions of these same
// properties. Remove them before appending the vehicle-specific versions —
// leaving both in place would mean two competing <meta property="og:title">
// tags, and which one a given crawler honors is parser-specific/undefined.
const OG_META_SELECTORS = [
  'head > meta[property="og:title"]',
  'head > meta[property="og:description"]',
  'head > meta[property="og:type"]',
  'head > meta[property="og:image"]',
  'head > meta[property="og:url"]',
  'head > meta[property="og:site_name"]',
  'head > meta[name="twitter:card"]',
  'head > meta[name="twitter:title"]',
  'head > meta[name="twitter:description"]',
  'head > meta[name="twitter:image"]',
];

// ---------------------------------------------------------------------------
// Vehicle data — mirrors the fields this file reads from
// PublicVehicleListItem (frontend/src/types/vehicle.ts)
// ---------------------------------------------------------------------------

interface VehiclePhotoData {
  url: string;
  is_visible: boolean;
  display_order: number;
}

interface VehicleData {
  id: number;
  brand: string;
  model_line: string | null;
  color: string | null;
  year: number | null;
  bride_description: string | null;
  bride_description_en: string | null;
  photos: VehiclePhotoData[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isBotRequest(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return BOT_UA_PATTERNS.some((pattern) => ua.includes(pattern));
}

function vehicleDisplayName(vehicle: VehicleData): string {
  const base = [vehicle.brand, vehicle.model_line, vehicle.color].filter(Boolean).join(" ");
  return vehicle.year ? `${base} (${vehicle.year})` : base;
}

/** Mirrors VehicleCard.tsx's `visiblePhotos` filter exactly — the backend's
 * GET /api/vehicles does NOT filter is_visible itself, so this must be
 * replicated here rather than trusting photos[0]. Also sorts by
 * display_order defensively, even though the backend already returns
 * photos pre-sorted. */
function vehicleOgImage(vehicle: VehicleData): string {
  const visible = vehicle.photos
    .filter((p) => p.is_visible)
    .sort((a, b) => a.display_order - b.display_order);
  return visible[0]?.url || FALLBACK_IMAGE;
}

function vehicleDescription(vehicle: VehicleData, isEnglish: boolean): string {
  const name = vehicleDisplayName(vehicle);
  if (isEnglish) {
    const explicit = vehicle.bride_description_en?.trim() || vehicle.bride_description?.trim();
    return (
      explicit ||
      `${name} — vehicle available for weddings and events in Medellín and Eastern Antioquia. Check availability and pricing on WhatsApp.`
    );
  }
  const explicit = vehicle.bride_description?.trim();
  return (
    explicit ||
    `${name} — vehículo disponible para bodas y eventos en Medellín y el Oriente Antioqueño. Consulta disponibilidad y precio por WhatsApp.`
  );
}

async function findVehicle(apiBaseUrl: string, vehicleId: number): Promise<VehicleData | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    // Deliberately the same public, unauthenticated endpoint CatalogPage.tsx
    // already calls (vehiclesApi.list()) — no new backend surface added.
    const res = await fetch(`${apiBaseUrl}/api/vehicles`, { signal: controller.signal });
    if (!res.ok) return null;
    const vehicles = (await res.json()) as VehicleData[];
    return vehicles.find((v) => v.id === vehicleId) ?? null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildMetaTagsHtml(
  vehicle: VehicleData,
  canonicalUrl: string,
  isEnglish: boolean,
): { title: string; tagsHtml: string } {
  const title = `${vehicleDisplayName(vehicle)} | ${SITE_NAME}`;
  const description = vehicleDescription(vehicle, isEnglish);
  const image = vehicleOgImage(vehicle);

  const tags: [string, string][] = [
    ["og:site_name", SITE_NAME],
    ["og:type", "website"],
    ["og:url", canonicalUrl],
    ["og:title", title],
    ["og:description", description],
    ["og:image", image],
    ["twitter:card", "summary_large_image"],
    ["twitter:title", title],
    ["twitter:description", description],
    ["twitter:image", image],
  ];

  const tagsHtml = tags
    .map(([name, content]) => {
      // og:* use the `property` attribute per the Open Graph protocol;
      // twitter:* use `name` per Twitter's Card spec.
      const attr = name.startsWith("og:") ? "property" : "name";
      return `<meta ${attr}="${name}" content="${escapeHtml(content)}">`;
    })
    .join("\n    ");

  return { title, tagsHtml };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url);
      const pathname = url.pathname.replace(/\/+$/, "") || "/";
      const isCatalogRoute = pathname === "/catalogo" || pathname === "/en/catalogo";
      const vehiculoParam = url.searchParams.get("vehiculo");
      const userAgent = request.headers.get("User-Agent") || "";

      if (!isCatalogRoute || !vehiculoParam || !isBotRequest(userAgent)) {
        return env.ASSETS.fetch(request);
      }

      const vehicleId = Number(vehiculoParam);
      if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
        return env.ASSETS.fetch(request);
      }

      const vehicle = await findVehicle(env.API_BASE_URL, vehicleId);
      if (!vehicle) {
        return env.ASSETS.fetch(request);
      }

      const shellResponse = await env.ASSETS.fetch(request);
      const contentType = shellResponse.headers.get("content-type") || "";
      if (!shellResponse.ok || !contentType.includes("text/html")) {
        return shellResponse;
      }

      const isEnglish = pathname.startsWith("/en/");
      const canonicalUrl = `${SITE_URL}${pathname}?vehiculo=${vehicle.id}`;
      const { title, tagsHtml } = buildMetaTagsHtml(vehicle, canonicalUrl, isEnglish);

      let rewriter = new HTMLRewriter();
      for (const selector of OG_META_SELECTORS) {
        rewriter = rewriter.on(selector, {
          element(element) {
            element.remove();
          },
        });
      }
      rewriter = rewriter
        .on("head", {
          element(element) {
            element.append(`    ${tagsHtml}\n  `, { html: true });
          },
        })
        .on("head > title", {
          element(element) {
            // No `{ html: true }` — default plain-text mode makes
            // HTMLRewriter escape this itself, so `title` is passed raw.
            element.setInnerContent(title);
          },
        });

      return rewriter.transform(shellResponse);
    } catch (err) {
      // Never let a crawler see a 500 — any failure above (backend down,
      // unexpected response shape, malformed id, etc.) falls through to
      // exactly today's existing behavior.
      console.error("og-preview worker fallback:", err);
      return env.ASSETS.fetch(request);
    }
  },
};
