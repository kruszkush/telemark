#!/bin/sh
# Publikacja Telemarku na stronie licznika (repo d2jsp-licznik, GitHub Pages; push = publikacja).
# Użycie (z katalogu telemark): sh scripts/d2jsp-publikuj.sh test|prod
#   test → https://kruszkush.github.io/d2jsp-licznik/test/ (serwer lotnik-test, hasło testerów), wersja X.Y-test +0.1
#   prod → https://kruszkush.github.io/d2jsp-licznik/ (serwer lotnik), wersja X.Y +0.1 („daj na official”, Mateusz 15.11).
#          Najpierw serwer: w lotniku `sh serwer/deploy.sh prod` (trasy /tm/* włączone), potem ta strona.
# Pierwsza publikacja prod (strona główna bez miejsca na Telemark) przenosi stronę testową na główną bez części testowych
# (pasek WERSJA TESTOWA, ../data.json), z Lotnikiem i wersją strony głównej. Później tylko nowe ?v= i wersja; inne zmiany
# w samej stronie testowej (wygląd poza kartą Telemarku) trzeba przenieść ręcznie.
# SUCHO=1: wszystko bez commita i pusha (sprawdzenie zmian w licznik: git diff; cofnięcie: git checkout docs && git clean -fd docs).
# Gra sama wybiera serwer po adresie strony (src/d2jsp/api.ts, d2jsp/strona.js). Wycofanie: `git revert <commit>` w licznik + push.
set -e
TRYB="$1"
case "$TRYB" in test|prod) ;; *) echo "użycie: sh scripts/d2jsp-publikuj.sh test|prod"; exit 1 ;; esac
SRC="$(cd "$(dirname "$0")/.." && pwd)"
LICZ="${LICZNIK:-/e/Vibe coding/d2jsp-licznik}"
NODE26="/e/Vibe coding/narzedzia/node26/node-v26.13.0-win-x64"
if [ "$TRYB" = test ]; then DIR=docs/test; SUF=-test; URL=https://kruszkush.github.io/d2jsp-licznik/test/
else DIR=docs; SUF=; URL=https://kruszkush.github.io/d2jsp-licznik/; fi
HTML="$LICZ/$DIR/index.html"
DST="$LICZ/$DIR/telemark"

cd "$SRC"
PATH="$NODE26:$PATH" node node_modules/vite/bin/vite.js build -c vite.d2jsp.config.ts --logLevel warn
V=$(git rev-parse --short HEAD)
[ -f dist-d2jsp/index.html ] || { echo "brak dist-d2jsp/index.html"; exit 1; }

cd "$LICZ"
wypchnij() {
  timeout 60 git push --quiet && return 0
  echo "push nieudany, ponawiam po pull --rebase"
  timeout 60 git pull --rebase --quiet && timeout 60 git push --quiet
}
[ -n "$SUCHO" ] || timeout 60 git pull --rebase --quiet

# Pierwsza publikacja prod: strona testowa → główna (bez części testowych), Lotnik i wersja z obecnej strony głównej.
if [ "$TRYB" = prod ] && ! grep -q '<div id="telemark"></div>' "$HTML"; then
  LV=$(sed -n 's#.*lotnik/nakladka\.js?v=\([0-9]*\).*#\1#p' "$HTML" | head -1)
  PV=$(sed -n 's#.*<span class="ver">\([0-9]*\.[0-9]*\)</span>.*#\1#p' "$HTML" | head -1)
  [ -n "$LV" ] && [ -n "$PV" ] || { echo "strona główna: brak Lotnika ?v= albo wersji X.Y"; exit 1; }
  sed -e '/>WERSJA TESTOWA</d' \
      -e "s#fetch('\.\./data\.json#fetch('data.json#" \
      -e 's#nieg na /test/:#nieg:#' \
      -e "s#lotnik/nakladka\.js?v=[0-9]*#lotnik/nakladka.js?v=$LV#" \
      -e "s#<span class=\"ver\">[0-9]*\.[0-9]*-test</span>#<span class=\"ver\">$PV</span>#" \
      -e "s#d2jsp [0-9]*\.[0-9]*-test</title>#d2jsp $PV</title>#" \
      "$LICZ/docs/test/index.html" > "$HTML"
  ! grep -q 'WERSJA TESTOWA\|\.\./\|-test<' "$HTML" || { echo "strona główna: zostały części testowe"; exit 1; }
  grep -q "lotnik/nakladka.js?v=$LV\"" "$HTML" && grep -q ">$PV<" "$HTML" || { echo "strona główna: nie przeniesiono Lotnika albo wersji"; exit 1; }
  echo "strona główna: przeniesiona ze strony testowej (Lotnik ?v=$LV, wersja $PV)"
fi

rm -rf "$DST"
mkdir -p "$DST"
cp -r "$SRC/dist-d2jsp/." "$DST/"
cp "$SRC/d2jsp/strona.js" "$DST/strona.js"

# Miejsce na kartę Telemarku (po kafelkach, przed wykresem) i skrypt strony: raz; potem tylko nowe ?v=.
grep -q '<div id="telemark"></div>' "$HTML" || sed -i 's#^<div class="card"><h2 id="chartH">#<div id="telemark"></div>\n\n&#' "$HTML"
grep -q '<div id="telemark"></div>' "$HTML" || { echo "nie wstawiono miejsca na Telemark"; exit 1; }
TAG="<script src=\"telemark/strona.js?v=$V\"></script>"
if grep -q 'telemark/strona.js' "$HTML"; then
  sed -i "s#<script src=\"telemark/strona.js[^\"]*\"></script>#$TAG#" "$HTML"
else
  sed -i "s#^<script type=\"module\" src=\"lotnik/nakladka.js#$TAG\n&#" "$HTML"
fi
grep -q "telemark/strona.js?v=$V" "$HTML" || { echo "nie wstawiono skryptu Telemarku"; exit 1; }

git add "$HTML" "$DST"   # tylko strona i Telemark: inne niezapisane pliki w docs/ (data.json, lotnik/) nie wchodzą do commita
if git diff --cached --quiet; then echo "bez zmian"; exit 0; fi
OLD=$(sed -n "s#.*<span class=\"ver\">\([0-9]*\.[0-9]*\)$SUF</span>.*#\1#p" "$HTML" | head -1)
[ -n "$OLD" ] || { echo "brak wersji X.Y$SUF w $HTML"; exit 1; }
NEW=$(echo "$OLD" | awk -F. '{ if ($2 >= 9) printf "%d.0", $1 + 1; else printf "%d.%d", $1, $2 + 1 }')
sed -i "s#>$OLD$SUF<#>$NEW$SUF<#g; s#d2jsp [0-9]*\.[0-9]*$SUF</title>#d2jsp $NEW$SUF</title>#" "$HTML"
grep -q ">$NEW$SUF<" "$HTML" || { echo "nie podbito wersji"; exit 1; }
git add "$HTML"
if [ -n "$SUCHO" ]; then git reset --quiet; echo "SUCHO: wersja $NEW$SUF, Telemark $V, bez commita (licznik: git diff)"; exit 0; fi
if [ "$TRYB" = test ]; then MSG="Strona testowa: Telemark $V (wersja $NEW-test)"; else MSG="Live: Telemark $V na stronie glownej (wersja $NEW)"; fi
git commit --quiet -m "$MSG"
wypchnij
echo "opublikowano: wersja $NEW$SUF, Telemark $V → $URL"
