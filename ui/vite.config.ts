import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Packaged Electron builds load index.html over file://, so assets must be
  // relative to that file instead of rooted at a development-server origin.
  base: "./",
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
  },
});
