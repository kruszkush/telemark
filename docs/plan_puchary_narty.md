# Plan: narty Telemarka na stronie licznika (14.11.2026)

Ustalenie: `docs/zasady_d2jsp.md` (punkt „Puchary Telemarka”). Szkic kształtu: `proto/puchary-telemark` (wersja B).

## Cel (co zobaczy gracz na stronie testowej)
- W kartach mistrzów Telemarka (rok, miesiąc, tydzień) duże skrzyżowane narty zamiast kielicha, w kolorach pucharów strony.
- Przy nicku w wynikach i wyścigach Telemarka małe narty za każdy tytuł Telemarka, ułożone jak puchary przy nicku w rankingu postów: płonące fioletowe za miesiąc najpierw, potem roczne, potem złote; każdy tytuł miesiąca zamienia jedne złote narty w płonące, z płonących sypią się iskry.
- Galeria sław: przy tytułach Telemarka narty (×liczba) zamiast niebieskiego znaczka i kielicha.
- Legenda na dole strony: narty roku, miesiąca, tygodnia i płonące złote narty.
- Korona przy rocznych nartach siedzi na nartach, nie wisi w powietrzu.

## Czego ten plan nie robi
- Nart w rankingu postów (tam tylko puchary za posty); błękitnej gwiazdki i fioletowego nicku za Telemark (decyzja Mateusza 14.11).
- Zmian serwera: wiersze tabel już niosą `puchary` (`lotnik/serwer/telemark.js` 382–401).
- Strony głównej (prod): dopiero po „daj na official”.

## Wzorzec
1. Sposób: ten sam co puchary za posty, przeniesiony 1:1 z `d2jsp-licznik/docs/test/index.html`: symbole SVG w `<defs>` (`cup/cupM/cupY`), płonące przez `fireCup(cls, sym, …)`, iskry z pętli, która szuka `.cup.fire` (klasy `fw`/`fm` dają kolor). Narty to nowe symbole `nartyW/M/Y` w tych samych `<defs>`; nic nowego w logice ognia i iskier. Spis sposobów: rodzaj problemu (ikony nagród przy nicku) nie ma wiersza; to przeniesienie działającego kodu strony.
2. Moduły:
   - `index.html` strony testowej: symbole nart, `tmBadges(klucze)` (ten sam układ co `nickBadges`, wystawione jako `window.tmBadges`), galeria sław, legenda.
   - `d2jsp/strona.js`: duże narty w kartach mistrzów, `tmBadges(r.puchary)` przy nicku w listach, przykładowe tytuły w `?tmdemo`.
3. Objaw → moduł: zły kształt lub korona → symbole w `index.html`; zła kolejność albo liczba nart przy nicku → `tmBadges`; brak nart przy nicku w karcie → `strona.js`; brak iskier → klasy `fw`/`fm` w `tmBadges`.
4. Sposób: znany dobry, przeniesienie działającego kodu strony (agent sposob 14.11; ryzyko tylko wizualne: płomień w obrysie kielicha nad nartami, ocena na arkuszu).

Furtki: nie (wygląd jednej rzeczy). Krytyk: nie (2 pliki kodu, bez fundamentu).

## Kroki
1. Próby korony (3 wersje) w kopii szkicu `proto/puchary-telemark/korona.html`, arkusz obok kielicha roku. ~15 min.
2. Symbole nart i `tmBadges` w `index.html`, galeria sław, legenda. ~20 min. Sprawdzenie: zrzut lokalny z `?demo&tmdemo`.
3. `strona.js`: duże narty, narty przy nicku, przykładowe tytuły. ~15 min. Sprawdzenie: zrzut kart Telemarka, iskry w sekwencji klatek.
4. Arkusz: obecne puchary obok nart w tych samych miejscach (karty, lista, galeria, legenda), z daleka i z bliska. Publikacja na test.

## Odrzucone drogi i ryzyka
- Osobne symbole ognia dla nart: odrzucone, `fireCup` przyjmuje dowolny symbol.
- Ryzyko: w wąskiej karcie mistrza nick z kilkoma nartami nie mieści się. Wtedy narty zostają, a nick się skraca (już ma wielokropek).
- Ryzyko: płomień nad nartami wypada w szczelinie między dziobami nart i wygląda inaczej niż nad kielichem; ocena na arkuszu.

Pierwszy pokaz po kroku 4: Mateusz ocenia narty na stronie testowej; jeszcze zepsute: nic znanego.

## Rozliczenie
(na koniec)
