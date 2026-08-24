import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // Packaged Electron builds load index.html over file://, so assets must be
  // relative to that file instead of rooted at a development-server origin.
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        id: "./",
        name: "RasPi Vehicle Control",
        short_name: "Vehicle Control",
        description: "Offline-capable controller for the RasPi Universal Vehicle",
        theme_color: "#16161e",
        background_color: "#0f0f13",
        display: "standalone",
        orientation: "landscape",
        scope: "./",
        start_url: "./",
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ["**/*.{js,css,html,png,svg,ico,webmanifest}"],
      },
    }),
  ],
  server: {
    host: true,
    port: 3000,
  },
});
