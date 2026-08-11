import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// IMPORTANT: if you deploy to https://<username>.github.io/<repo-name>/
// set base to "/<repo-name>/". If this repo IS your <username>.github.io
// repo (a user/organization site), leave base as "/".
export default defineConfig({
  plugins: [react()],
  base: "/Flashcard/",
});
