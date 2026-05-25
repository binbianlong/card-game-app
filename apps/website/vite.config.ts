import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

const workerOrigin = process.env.VITE_WORKER_ORIGIN ?? "http://localhost:8787";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: workerOrigin,
        changeOrigin: true,
      },
      "/parties": {
        target: workerOrigin,
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
