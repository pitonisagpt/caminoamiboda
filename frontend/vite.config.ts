import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig, type Plugin } from "vite";

// Vite's dev server serves files from public/ as text/plain with no charset,
// so browsers guess the encoding and mangle the accented characters in these
// UTF-8 files. Serve them directly with an explicit charset instead.
function utf8StaticText(): Plugin {
  const files = ["/robots.txt", "/llms.txt", "/llms-full.txt", "/ai.txt"];
  return {
    name: "utf8-static-text",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || !files.includes(req.url)) return next();
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end(readFileSync(resolve(__dirname, "public", req.url.slice(1)), "utf-8"));
      });
    },
  };
}

export default defineConfig({
  build: { sourcemap: "hidden" },
  plugins: [
    react(),
    utf8StaticText(),
    // Uploads source maps to Sentry so production stack traces show real
    // source instead of minified code. No-ops (with a console warning) when
    // SENTRY_AUTH_TOKEN isn't set — e.g. CI builds/PRs that don't have the
    // secret — so it never blocks `npm run build`.
    sentryVitePlugin({
      org: process.env.SENTRY_ORG ?? "camino-a-mi-boda",
      project: process.env.SENTRY_PROJECT ?? "camino-boda-frontend",
      authToken: process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: {
        // Source maps are only needed to reach Sentry, not to ship publicly
        // on Cloudflare Pages — delete them from dist/ once uploaded.
        filesToDeleteAfterUpload: ["dist/**/*.js.map"],
      },
      release: {
        // name/inject/create/finalize all default to on, using the git HEAD
        // SHA as the release name — matches the backend's release tag
        // (RENDER_GIT_COMMIT), since both deploy from the same commit.
        setCommits: { auto: true, ignoreMissing: true },
        deploy: { env: "production" },
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_BACKEND_URL ?? "http://localhost:8000",
        changeOrigin: true,
      },
      "/sitemap.xml": {
        target: process.env.VITE_BACKEND_URL ?? "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
