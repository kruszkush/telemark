import { mergeConfig, type Plugin } from "vite";
import base from "./vite.config.ts";

/**
 * Gra do okna strony licznika d2jsp (docs/plan_d2jsp.md krok 3): ta sama gra z innym wejściem (src/d2jsp/main.tsx),
 * ścieżki względne (strona leży w podfolderze), bez manifestu i bez znacznika service workera.
 */
function d2jspPage(): Plugin {
  return {
    name: "d2jsp-page",
    // Przed własną obróbką Vite, żeby zbudował nowe wejście.
    transformIndexHtml: {
      order: "pre",
      handler: (html) =>
        html
          .replace(/\s*<!-- Marks the page[\s\S]*?-->\s*<meta name="telemark-offline"[^>]*>/, "")
          .replace(/\s*<link rel="manifest"[^>]*>/, "")
          .replace(/\s*<link rel="(?:icon|apple-touch-icon)"[^>]*>/g, "")
          .replace('href="/">wczytaj', 'href="./">wczytaj')
          .replace('src="/src/main.tsx"', 'src="/src/d2jsp/main.tsx"'),
    },
  };
}

export default mergeConfig(base, {
  base: "./",
  publicDir: false,
  plugins: [d2jspPage()],
  build: { outDir: "dist-d2jsp", emptyOutDir: true },
});
