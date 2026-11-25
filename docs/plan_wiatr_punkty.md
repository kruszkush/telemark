# Plan: punkty za wiatr w skokach dnia (d2jsp), od 26.11.2026

Ustalenia z Mateuszem (25.11): `docs/zasady_d2jsp.md`, punkt „Punkty i tabele”. Ten plik to plan wykonania i rozliczenie.

## Cel (co gracz zobaczy)
Od skoków dnia 26.11 (nowy dzień o północy czasu polskiego, nowe skocznie) po skoku na pasku na dole obrazu stoją punkty razem z wiatrem i osobno punkty za wiatr, np. „+4,1 wiatr”. Za wiatr w plecy gra dodaje punkty, za wiatr pod narty odejmuje, tyle, ile metrów ten wiatr naprawdę zabrał albo dodał na tej skoczni. Ranking dnia, tygodnia, miesiąca i roku liczy punkty z wiatrem. Dni do 25.11 zostają, jak były.

## Czego ten plan nie robi
- Bez premii za wiatr w plecy jak w telewizji (Mateusz 25.11: u nas skok z wiatrem w plecy nie jest trudniejszy; kod: `src/sim/jump-logic.ts:254`, szarpnięcie w locie słabsze przy wietrze w plecy).
- Bez wiatru z boku (jak w telewizji).
- Bez przeliczania starych skoków i bez zmiany punktów liczonych przez grę autora (zgodność z oryginałem i powtórkami): punkty za wiatr są dodatkiem obok.
- Bez zmiany wiatru, fizyki ani tego, jak losuje się wiatr skoków dnia.
- Bez belki startowej i punktów za belkę (u nas jej nie ma).
- Bez nowego wyglądu poza jednym napisem na pasku i zdaniem w opisie zasad.

## Pomiar (25.11, `src/d2jsp/wind-measure.test.ts`, `WIATR_POMIAR=1`)
Komputerowy skoczek (poziom 2 i 4) na każdej z 23 skoczni dnia: 40 skoczków przy stałym wietrze −3…+3 m/s i 150 skoków przy zwykłym, zmiennym wietrze. Wynik: odległość zależy od wiatru prawie jak prosta (R² 0,76–0,97 przy stałym wietrze), słabo od poziomu skoczka (różnica do 0,4 m na 1 m/s), wiatr w plecy skraca skok. Od 0,7 m na 1 m/s (Zajęcza K50) do ok. 5–6 m (mamucie). Średni wiatr z lotu tłumaczy odległość odrobinę lepiej niż średni od belki (R² wyższe o ok. 0,01), więc liczy się lot, jak w telewizji.

Drugi pomiar (25.11, po krytyku, wiatr −4…+4 m/s, osobne proste dla wiatru pod narty i w plecy; wydruk w `src/d2jsp/wind-points.ts` jako tabela): na dużych skoczniach wiatr w plecy zabiera wyraźnie więcej metrów na 1 m/s, niż wiatr pod narty dodaje (Lodowiec K265: 6,2 wobec 4,1 m). Reguła: dwa przeliczniki na skocznię, każdy to średnia poziomu 2 i 4 przy stałym wietrze; średni wiatr z lotu > 0 (w plecy) bierze przelicznik pleców, < 0 pod narty. To nie premia za wiatr w plecy (odrzucona), tylko dokładnie tyle metrów, ile wiatr zabrał albo dodał.

## Decyzje po krytyku (25.11)
- Dzień liczenia z biletu (`b.day`, w grze `ticket.day`), nie z zegara: `checkJump(hillId, seed, inputs, day)`; bilet z 25.11 wysłany po północy liczy się bez wiatru.
- Suma i obcięcie do 0 tylko w `wind-points.ts`; `checkJump` oddaje `pointsWithWind`, serwer `tenths(r.pointsWithWind ?? r.points)`.
- Lot = klatki od `PHASE.afterTakeoff` do `PHASE.landingPrep` (jak pomiar); 0 klatek lotu = wiatr 0.
- Oglądany skok (▶) pokazuje na pasku punkty z wiatrem tak samo (dzień skoku z serwera).
- Sprawdzenie na teście przed północą: osobny plik symulacji z okresem od 25.11 tylko na lotnik-test, potem budowa z 26.11 na test i prod; w kroku 5 sprawdzam, że plik prod ma 2026-11-26.
- Jeśli o 23:30 prod nie jest wgrany: budowa z 27.11, nie zmiana po fakcie.
- Wiersz spisu sposobów: „W-wiatr” (W4 zajęte).

## Wzorzec
1. Technika: wyrównanie wiatru jak w Pucharze Świata FIS (źródła FIS nie otwierałem, rok i szczegóły nie sprawdzone): średni wiatr wzdłuż skoczni z czasu lotu razy stały przelicznik skoczni (metry na 1 m/s razy punkty za metr). Przelicznik u nas z pomiaru symulatorem, nie z tabeli FIS. Spis sposobów: nowy wiersz W4, „nie próbowane”.
2. Moduły:
   - `src/d2jsp/wind-points.ts` (nowy): tabela „metry na 1 m/s” dla 23 skoczni z pomiaru, dzień startu `2026-11-26`, punkty za wiatr z (dzień, skocznia, średni wiatr z lotu); jedyne miejsce liczenia.
   - `src/d2jsp/jump-check.ts`: przy odtwarzaniu skoku sumuje wiatr wzdłuż skoczni w klatkach lotu (od wybicia do lądowania) i oddaje średnią oraz punkty za wiatr. Ta sama funkcja liczy w grze i na serwerze.
   - `src/d2jsp/d2jsp-app.tsx`: po lądowaniu skoku dnia gra liczy skok jeszcze raz z ruchów (jak serwer), wysyła punkty z wiatrem i podaje punkty za wiatr do paska.
   - `src/render/jump-view-hud.ts` + `src/ui/jump-screen.tsx` (pole w `ContestJump`): napis na pasku.
   - `lotnik/serwer/telemark.js`: zapisuje punkty z wiatrem, osobno średni wiatr i punkty za wiatr.
3. Objaw → moduł: zła liczba punktów za wiatr → `wind-points.ts`; serwer i gra różnią się → `jump-check.ts`; napis źle wygląda → `jump-view-hud.ts`; tabela liczy bez wiatru → `telemark.js`.
4. Sposób: znany, u nas nie próbowany (agent sposob, 25.11); gra i serwer tym samym kodem to W1 („działa”). Wiersz W4 do spisu po ocenie w grze.

## Furtki (plan-furtki 25.11, przyjęte jako decyzje techniczne)
- `pw` (punkty za wiatr, dziesiąte części) także w obiekcie skoku w listach dnia (`telemark.js:272`, `b<g>`) i w najlepszym skoku okresu (`:300`), w odpowiedziach dzielone przez 10 jak `p`, w odpowiedzi oglądanego skoku (`:422`). Później kolumna „wiatr” w tabelach bez migracji.
- Przeliczniki jako lista okresów `{ od: dzień, metry na 1 m/s }`; przed pierwszym okresem 0. Przestrojenie albo przesunięcie startu to nowy wpis, stare dni się nie zmieniają.
- Test: każda skocznia z `HILL_GROUPS` ma przelicznik (brak = czerwony test).
- Serwer czyta pola wiatru z wartością domyślną 0 (skok rozpoczęty na starym pliku symulacji).
- Do banku pomysłów (widoczne w grze, decyzja Mateusza): kolumna „wiatr” w tabeli Dzisiaj; linia do pobicia z wiatrem w powtórce.

## Kroki
1. (10 min) `wind-points.ts` z tabelą z pomiaru i testem: 0 przed 26.11, znak (w plecy dodaje), mamucia K300 przy +2 m/s ok. +13 pkt. Sprawdzenie: `vitest run src/d2jsp`.
2. (15 min) `jump-check.ts`: średni wiatr z lotu i punkty za wiatr w wyniku; test, że skok z pomiaru daje średnią zgodną z wiatrem w locie i że stare pola się nie zmieniły. Sprawdzenie: `vitest run src/d2jsp`, `node scripts/d2jsp-sim-node.mjs`.
3. (15 min) Gra: punkty z wiatrem wysyłane i na pasku, napis wiatru. Sprawdzenie: zrzut paska po skoku na stronie testowej (komputer i telefon), dzień udawany jako 26.11.
4. (15 min) Serwer: `telemark.js` zapisuje `p` z wiatrem, `w` i `pw`; `node lotnik/test-telemark.mjs`; plik symulacji do Lotnika, deploy test, próbny skok `node scripts/d2jsp-proba.mjs`.
5. (10 min) Opis zasad w grze, `docs/zasady_d2jsp.md`, spis sposobów W4, STAN. Publikacja test, potem prod: serwer (Mateusz wkleja) i strona, przed północą 25/26.11.

## Odrzucone drogi i ryzyka
- Przelicznik z tabeli FIS: nasza fizyka to nie prawdziwa skocznia; pomiar daje uczciwe wyrównanie u nas.
- Przeliczanie każdego skoku drugi raz bez wiatru (te same ruchy, wiatr 0): skok gracza reaguje na wiatr, te same ruchy w innym wietrze dałyby inny skok albo upadek.
- Ryzyko: gra i serwer policzą inaczej → serwer liczy sam i to jego liczba idzie do tabel; różnica tylko w dzienniku (`telemark.js:268`).
- Ryzyko: prod nie zdąży przed północą → skoki 26.11 przed wgraniem pójdą bez wiatru; dzień przełączenia wtedy przesuwam o dzień i mówię Mateuszowi.
- Ryzyko: upadek z wiatrem dostaje punkty za wiatr jak każdy skok (tak w telewizji); punkty skoku nie spadają poniżej 0 (`telemark.js:115`).

## Wczesny pokaz
Pierwszy pokaz po kroku 3: Mateusz ocenia napis na pasku i liczby po skoku na stronie testowej; jeszcze zepsute: serwer test liczy bez wiatru (tabela).

Krytyk: tak (5 plików kodu, zapis wyników).

## Rozliczenie
- 25.11 na teście (próbna symulacja 0.25.17, wiatr od 25.11): skok dnia na Wieczornej K95, okienko „WIATR -2,4” pod notami, pasek 9,2 pkt, serwer zapisał p 9,2 i pw -2,4; ▶ z `&test` pokazuje to samo na komputerze (1920×950) i telefonie (poziomo i pionowo). Zrzuty `../d2jsp-wiatr-2511/`.
- Poprawione przy oglądaniu: zdanie dla czytnika ekranu po skoku mówiło wynik bez wiatru (11,6); teraz „Za wiatr: -2,4 punktu. Wynik: 9,2 punktu.” (sprawdzone w ▶; po własnym skoku nie sprawdzone na żywo, bo dziś na teście wiatr już nie liczy).
- 0.25.18 (start 26.11) na lotnik-test i stronie 23.2-test: skok z 25.11 daje pw 0, bez okienka (`../d2jsp-wiatr-2511d/`). Plik `telemark-sim-0.25.18.mjs` ma `od: "2026-11-26"`, 184/184 zgodnych w Node 22. Zdanie w opisie zasad, ekran dnia mieści się w 1920×950 (zapas 145 px).
- Wcześniejsze, nie od wiatru: w ▶ przycisk „POMIŃ” zasłania czwartą notę.
- Prod: patrz STAN.md.
