# STAN: Telemark na stronie licznika d2jsp

Ustalenia z Mateuszem: `docs/zasady_d2jsp.md`. Plan, przebieg skoku dnia, model danych, rozstrzygnięcia bez Mateusza i rozliczenie: `docs/plan_d2jsp.md`. Kod autora: klon https://github.com/visvaya/telemark (`master` = autor, nasza praca na gałęzi `d2jsp`; nie pushować do autora).

## Stan (14.11.2026, kroki 1–6 zrobione, wszystko tylko na teście)
- Strona testowa: https://kruszkush.github.io/d2jsp-licznik/test/ (karta „Telemark: Skocznie dnia” pod kafelkami, przycisk Telemark otwiera grę w oknie). Serwer: trasy `/tm/*` w `lotnik-test` (włączane tylko przez `sh serwer/deploy.sh test`). Strona główna i serwer prod nietknięte.
- Narzędzia: Node 26 `E:\Vibe coding\narzedzia\node26\node-v26.13.0-win-x64` (gra), Node 22 `narzedzia\node22\…` (jak chmura). Bash: `export PATH="/e/Vibe coding/narzedzia/node26/node-v26.13.0-win-x64:$PATH"`.
- Publikacja na test: `sh scripts/d2jsp-publikuj.sh test` (buduje `vite.d2jsp.config.ts`, kopiuje do `d2jsp-licznik/docs/test/telemark/`, wersja strony +0.1). Plik symulacji do serwera: `sh scripts/d2jsp-sim-do-lotnika.sh`, potem deploy test w lotniku.
- Sprawdzenia: `vitest run src/d2jsp`, `node scripts/d2jsp-sim-node.mjs`, `playwright test -c playwright.d2jsp.config.ts`, `node lotnik/test-telemark.mjs`, żywy `node lotnik/out/tm-smoke.mjs`, próbny skok `node scripts/d2jsp-proba.mjs <folder> <0-2>`, zrzuty strony `node scripts/d2jsp-strona-zrzuty.mjs <folder>`. Konto próbne: `lotnik/out/_tm-konto-testowe.log` (poza repo).
- Znane: po skoku obraz mówi „jeszcze raz”, klik wraca do listy skoczni (jak w zawodach autora); dzisiejsze ▶ działa od jutra (sprawdzenie dziś: `telemark/index.html?ogladaj=<gid>&test`).

## Następny krok
1. Ocena Mateusza na stronie testowej. Prod dopiero na „daj na official”: tryb prod w `scripts/d2jsp-publikuj.sh` (docs/, serwer `lotnik` z TELEMARK w `deploy.sh prod`).
2. Publiczne repo kruszkush/telemark (GPL-3.0) dopiero po „repo tak”.
