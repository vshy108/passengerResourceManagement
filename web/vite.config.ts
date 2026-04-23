import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// `base` is overridden in CI when deploying to a project page
// (e.g. https://<user>.github.io/passengerResourceManagement/).
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? "/",
  build: { outDir: "dist" },
});
