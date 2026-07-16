import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import react from "@vitejs/plugin-react";
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
  plugins: [react(), utf8StaticText()],
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
