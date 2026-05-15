import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    // Each lazy-loaded page renders < 50 kB on its own; the chunk-size warning
    // fires for libs like exceljs and jspdf, which already live in their own
    // chunks below and are loaded on demand. Raise the threshold to keep the
    // build output clean.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          supabase: ["@supabase/supabase-js"],
          ui: ["@radix-ui/react-dialog", "@radix-ui/react-select", "@radix-ui/react-tabs"],
          charts: ["recharts"],
          pdf: ["jspdf", "jspdf-autotable"],
          // Pull exceljs + jszip out of the main bundle. They're only used by
          // BulkImportPage and the Export-to-Excel button, both of which are
          // already lazy-loaded by route, so this chunk is loaded on demand.
          excel: ["exceljs"],
          archive: ["jszip"],
          i18n: ["i18next", "react-i18next", "i18next-browser-languagedetector"],
        },
      },
    },
  },
});
