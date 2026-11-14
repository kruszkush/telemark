#!/bin/sh
# Publikacja Telemarku na stronie testowej licznika (repo d2jsp-licznik, GitHub Pages; push = publikacja).
# Użycie (z katalogu telemark): sh scripts/d2jsp-publikuj.sh test
#   test → https://kruszkush.github.io/d2jsp-licznik/test/ (serwer lotnik-test, hasło testerów), wersja X.Y-test +0.1
# Strona główna (prod) dopiero na słowa Mateusza „daj na official”: wtedy dopisać tryb prod (docs/, serwer lotnik
# z TELEMARK=1 w deploy.sh prod). Wzór: lotnik/scripts/publikuj.sh.
set -e
TRYB="$1"
[ "$TRYB" = test ] || { echo "użycie: sh scripts/d2jsp-publikuj.sh test   (prod tylko po decyzji Mateusza)"; exit 1; }
SRC="$(cd "$(dirname "$0")/.." && pwd)"
LICZ="${LICZNIK:-/e/Vibe coding/d2jsp-licznik}"
NODE26="/e/Vibe coding/narzedzia/node26/node-v26.13.0-win-x64"
HTML="$LICZ/docs/test/index.html"
DST="$LICZ/docs/test/telemark"
SUF=-test

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
timeout 60 git pull --rebase --quiet
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

git add docs/test
if git diff --cached --quiet; then echo "bez zmian"; exit 0; fi
OLD=$(sed -n "s#.*<span class=\"ver\">\([0-9]*\.[0-9]*\)$SUF</span>.*#\1#p" "$HTML" | head -1)
[ -n "$OLD" ] || { echo "brak wersji X.Y$SUF w $HTML"; exit 1; }
NEW=$(echo "$OLD" | awk -F. '{ if ($2 >= 9) printf "%d.0", $1 + 1; else printf "%d.%d", $1, $2 + 1 }')
sed -i "s#>$OLD$SUF<#>$NEW$SUF<#g" "$HTML"
grep -q ">$NEW$SUF<" "$HTML" || { echo "nie podbito wersji"; exit 1; }
git add docs/test
git commit --quiet -m "Strona testowa: Telemark $V (wersja $NEW-test)"
wypchnij
echo "opublikowano: wersja $NEW$SUF, Telemark $V → https://kruszkush.github.io/d2jsp-licznik/test/"
