import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The SPA lives in app/; its build lands in app/dist, which wrangler.jsonc serves as
// static assets. In dev, /api/* is proxied to `wrangler dev` (port 8787) so cookies stay
// first-party on one origin.
export default defineConfig({
  root: import.meta.dirname,
  plugins: [react()],
  build: { outDir: "dist", emptyOutDir: true, sourcemap: true },
  server: {
    port: 5173,
    host: true,
    proxy: { "/api": "http://127.0.0.1:8787" },
  },
});
