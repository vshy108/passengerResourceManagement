import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Vite config.
 *
 * `base` is overridden only if deploying under a sub-path.
 *
 * `/api/*` is proxied to the Fastify server started by `npm run serve`
 * at the repo root (default :3000). The `/api` prefix is stripped so
 * `GET /api/passengers` in the browser becomes `GET /passengers` on
 * the server — see specs/11-web-interactive.md (WI-R1).
 */
const API_TARGET = process.env.VITE_API_TARGET ?? "http://localhost:3000";

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? "/",
  build: { outDir: "dist" },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: API_TARGET,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
});
