import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { voidPlugin } from "void";

const isVercelStaticBuild = process.env.VERCEL_STATIC_BUILD === "1";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    voidPlugin(),
    react(),
    !isVercelStaticBuild &&
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: [
          "favicon.ico",
          "favicon.svg",
          "apple-touch-icon-180x180.png",
        ],
        manifest: {
          name: "ETHGlobal Mumbai 2026",
          short_name: "Mumbai2026",
          description: "ETHGlobal Mumbai 2026 hackathon app",
          theme_color: "#ffffff",
          background_color: "#ffffff",
          display: "standalone",
          start_url: "/",
          scope: "/",
          icons: [
            { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
            { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
            {
              src: "maskable-icon-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        },
      }),
  ],
});
