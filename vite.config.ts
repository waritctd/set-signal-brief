import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// React codebase, shipped on Preact (compat alias) — same components, ~4x smaller bundle.
// Single-file build: the Edge Function serves dist/index.html as-is; Vercel/Netlify serve dist/.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  resolve: {
    alias: {
      react: "preact/compat",
      "react-dom": "preact/compat",
      "react/jsx-runtime": "preact/jsx-runtime",
      "react/jsx-dev-runtime": "preact/jsx-dev-runtime",
    },
  },
  build: { target: "es2020", cssCodeSplit: false, assetsInlineLimit: 100000000, reportCompressedSize: false },
});
