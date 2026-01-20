import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  build: {
    sourcemap: false,
    minify: "esbuild",
    chunkSizeWarningLimit: 1000,
  },


  optimizeDeps: {
    include: ["react", "react-dom"],
  },
});
