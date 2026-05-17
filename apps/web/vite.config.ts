import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");

// resolve workspace packages directly to source so vite picks up edits without a build step.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  resolve: {
    alias: {
      "@mimi/types": resolve(repoRoot, "packages/types/src/index.ts"),
      "@mimi/notion-client": resolve(repoRoot, "packages/notion-client/src/index.ts"),
      "@mimi/animalese": resolve(repoRoot, "packages/animalese/src/index.ts"),
    },
  },
});
