import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: [
        "icons/kjventure-32.png",
        "icons/kjventure-180.png",
        "icons/kjventure-mark.svg",
      ],
      manifest: {
        name: "KJVenture",
        short_name: "KJVenture",
        description: "Play Together. Journey Through the Word.",
        theme_color: "#17324d",
        background_color: "#fff8e8",
        display: "standalone",
        orientation: "any",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/icons/kjventure-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/kjventure-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icons/kjventure-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,svg,png,woff2,txt,md}"],
        navigateFallback: "/index.html",
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  test: {
    environment: "jsdom",
    fileParallelism: false,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    maxWorkers: 2,
    setupFiles: "./src/test/setup.ts",
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
  },
});
