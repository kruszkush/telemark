#!/bin/sh
# Plik symulacji Telemarku dla serwera Lotnika (docs/plan_d2jsp.md, krok 2): buduje dist-d2jsp-sim/telemark-sim-<wersja>.mjs,
# sprawdza go w Node 22 na zestawie próbnych skoków i kopiuje do lotnik/serwer/telemark/ (tam commit; deploy.sh kopiuje do gra/).
# Użycie (z katalogu telemark): sh scripts/d2jsp-sim-do-lotnika.sh
set -e
cd "$(dirname "$0")/.."
N26="/e/Vibe coding/narzedzia/node26/node-v26.13.0-win-x64/node.exe"
N22="/e/Vibe coding/narzedzia/node22/node-v22.23.4-win-x64/node.exe"
LOT="${LOTNIK:-/e/Vibe coding/lotnik}"
"$N26" node_modules/vite/bin/vite.js build -c vite.d2jsp-sim.config.ts --logLevel warn
"$N22" scripts/d2jsp-sim-node.mjs
mkdir -p "$LOT/serwer/telemark"
cp dist-d2jsp-sim/telemark-sim-*.mjs "$LOT/serwer/telemark/"
ls "$LOT/serwer/telemark/"
