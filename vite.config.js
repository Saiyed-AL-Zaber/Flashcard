import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// IMPORTANT: if you deploy to https://<username>.github.io/<repo-name>/
// set base to "/<repo-name>/". If this repo IS your <username>.github.io
// repo (a user/organization site), leave base as "/".
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon-192.png", "icon-512.png", "apple-touch-icon.png"],
      manifest: {
        name: "Study Desk — Flashcards",
        short_name: "Study Desk",
        description: "Folders, colored flashcard sets, study mode, and quizzes — works offline.",
        theme_color: "#E3A73B",
        background_color: "#241D16",
        display: "standalone",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // cache the app shell (JS/CSS/HTML/icons) so the app itself opens with no connection
        globPatterns: ["**/*.{js,css,html,png,svg}"],
        runtimeCaching: [
          {
            // Supabase API calls: try the network first, but don't hang forever offline
            urlPattern: ({ url }) => url.hostname.endsWith(".supabase.co"),
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-cache",
              networkTimeoutSeconds: 4,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  base: "/Flashcard/",
});
