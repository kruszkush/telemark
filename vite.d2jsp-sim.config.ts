import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

/**
 * Plik symulacji dla serwera Telemarku na stronie licznika d2jsp (Node 22, lotnik/serwer/telemark.js): jeden moduł ES
 * bez zależności, nazwany wersją gry. `node node_modules/vite/bin/vite.js build -c vite.d2jsp-sim.config.ts`.
 */
const version = (JSON.parse(readFileSync(new URL("package.json", import.meta.url), "utf8")) as { version: string })
  .version;

export default defineConfig({
  define: { "import.meta.env.GAME_VERSION": JSON.stringify(version) },
  publicDir: false,
  build: {
    outDir: "dist-d2jsp-sim",
    emptyOutDir: true,
    target: "node22",
    minify: false,
    lib: {
      entry: "src/d2jsp/server-entry.ts",
      formats: ["es"],
      fileName: () => `telemark-sim-${version}.mjs`,
    },
  },
});
