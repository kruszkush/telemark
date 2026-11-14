# STAN: Telemark na stronie licznika d2jsp

Ustalenia z Mateuszem: `docs/zasady_d2jsp.md`. Plan i rozstrzygnięcia bez Mateusza: `docs/plan_d2jsp.md`. Kod autora: klon https://github.com/visvaya/telemark (`master` = autor, nasza praca na gałęzi `d2jsp`).

## Stan (14.11.2026, praca w toku, jedna sesja bez Mateusza)
- Narzędzia: Node 26 przenośny `E:\Vibe coding\narzedzia\node26\node-v26.13.0-win-x64` (gra wymaga ≥ 26.12.1, systemowy Node 24 zostaje), Node 22 przenośny `narzedzia\node22\…` (jak serwer w chmurze); pnpm przez `corepack pnpm@12.14.0`. W Bashu: `export PATH="/e/Vibe coding/narzedzia/node26/node-v26.13.0-win-x64:$PATH"`.
- Krok 1 planu ZROBIONY: plik symulacji serwera `dist-d2jsp-sim/telemark-sim-0.25.16.mjs` (`node node_modules/vite/bin/vite.js build -c vite.d2jsp-sim.config.ts`) liczy 184 próbne skoki (23 skocznie, automat i zepsute ruchy, 92 upadki, 11 dyskwalifikacji) tak samo jak gra: Node 22/24/26, Chromium, Brave, WebKit (komputer i iPhone), Firefox 160 z systemu. Testy: `vitest run src/d2jsp`, `node scripts/d2jsp-sim-node.mjs`, `playwright test -c playwright.d2jsp.config.ts` (Firefox Playwrighta blokuje Windows, zamiast niego `node scripts/d2jsp-sim-browser.mjs "C:/Program Files/Mozilla Firefox/firefox.exe" -headless -no-remote -profile "{profile}"`).

## Następny krok
- Krok 2 planu: trasy `/tm/*` w serwerze Lotnika (`lotnik/serwer/telemark.js`), wdrożenie na `lotnik-test`, próba żywego serwera. Potem krok 3 (gra), 4 (strona), 5 (oglądanie), 6 (całość + przegląd).
