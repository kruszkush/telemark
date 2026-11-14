# Plan: kolumna Telemarka na stronie licznika, mistrz roku, ekran „Skoki gracza” (14.11.2026)

Ustalenia: `docs/zasady_d2jsp.md` („Strona licznika”, „Punkty i tabele”). Wzór wyglądu: `proto/strona-mistrzowie/makieta-c.html` (zatwierdzony przez Mateusza 14.11).

## Cel (co widać)
- Na stronie licznika (test) karta Telemarka wygląda jak makieta C: trzy karty mistrzów (rok, miesiąc, tydzień) z pucharami strony; przy przyznanym okresie zwycięzca, jego punkty i ▶ najlepszego skoku, pod spodem „wyniki końcowe” 5 osób; przy nieprzyznanym (rok 2026) „jeszcze nieznany” i „na czele” 5 osób. Pod nimi trzy wyścigi trwających okresów (3 osoby z paskiem, „Koniec: … (za …)”), na dole miejsce zalogowanego.
- ▶ przy każdym nicku (wyniki końcowe, na czele, wyścigi) odtwarza najlepszy skok tej osoby w tym okresie; dzisiejszy wyszarzony do jutra.
- Klik w nick otwiera grę na ekranie „Skoki gracza”: dni okresu z wynikiem dnia (liczone dni wyróżnione), po wybraniu dnia 3 skocznie i wszystkie skoki z ▶ (2 liczone wyróżnione), dzisiejsze ▶ zablokowane do jutra.
- W zakresie „24 h” nie ma wykresu „Posty co godzinę” (inne zakresy mają dalej „Posty dziennie”).
- W galerii sław przy nicku dochodzą tytuły Telemarka ze znaczkiem narty.

## Czego ten plan nie robi
- Nie zmienia prawej kolumny strony (mistrzowie postów, historia), strony głównej ani serwera prod.
- Nie zapisuje roku osobno w bazie: rok liczony przy odczycie z miesięcy (nie trzeba przeliczać starych dni, jedno źródło).
- Nie dodaje historii poprzednich okresów Telemarka (tylko ostatni zakończony, jak w makiecie).
- Nie dodaje wyszukiwania gracza ani porównania dwóch graczy.

## Wzorzec
1. Sposób: tabele z zapisanych sum (już w `lotnik/serwer/telemark.js` rows/cup) rozszerzone o rok, odczyt z pamięcią 60 s; odtwarzanie skoku: spis W1 (ruchy z serwera, gra sama odtwarza). Wygląd kart: przeniesiony 1:1 z makiety C (ta sama strona, te same puchary `#cup/#cupM/#cupY`). Ekran gracza w grze: wzór tabel zawodów autora (`contest-table`, jak `src/d2jsp/week-table.tsx`).
2. Moduły:
   - serwer `lotnik/serwer/telemark.js`: `OKRESY` + rok (200 dni), `rows(key)` dla roku łączy miesiące roku, `/tm/tabele` z końcem okresów i listą tytułów (galeria), nowa trasa `/tm/gracz` (dni okresu albo skoki jednego dnia).
   - strona `d2jsp-licznik/docs/test/telemark/strona.js`: tylko karta Telemarka (mistrzowie, wyścigi, ▶, nick → gra, tytuły do galerii przez `window.tmFame`).
   - strona `docs/test/index.html`: ukrycie wykresu godzinowego, galeria sław łączy puchary postów i Telemarka (`drawFame`).
   - gra `src/d2jsp/player-screen.tsx` (nowy): ekran „Skoki gracza”; `api.ts` zapytanie; `d2jsp-app.tsx` ekran `player` otwierany z `?gracz=nick&okres=key`, ▶ wraca na ten ekran.
3. Objaw → moduł: zła suma albo zwycięzca → serwer `rows/cup`; zły wygląd karty, ▶ albo klik nicka → `strona.js`; wykres albo galeria → `index.html`; zła lista skoków → `/tm/gracz`; zły wygląd listy albo powrót → `player-screen.tsx`/`d2jsp-app.tsx`.
4. Sposób: znany dobry (agent sposob; ▶ i ruchy to W1, sumy okresów przy odczycie bez wpisu w spisie, dopisany wiersz W2 „nie próbowane”).

Krytyk: tak (6 plików kodu w 3 repo). Furtki: nie dotyczy (tabele i ekran przeglądania, bez mechaniki gry).

## Kroki
1. Serwer: rok w `periodKeys`/`previous`, `rows` roku z miesięcy, `koniec` okresu, `slawa`, `/tm/gracz`; testy czystych funkcji w `lotnik/test-telemark.mjs` (klucz roku, poprzedni rok, łączenie miesięcy). Sprawdzenie: `node test-telemark.mjs`.
2. Wdrożenie test (`sh serwer/deploy.sh test`), `out/tm-smoke.mjs` rozszerzony o rok, `prev.podium` z `best`, `/tm/gracz` (dni, skoki dnia, liczone, dzisiejsze bez ▶). Sprawdzenie: smoke przechodzi.
3. Gra: `player-screen.tsx`, `api.ts`, `d2jsp-app.tsx`, teksty; vitest dla czystego przeliczenia „liczone” jeśli powstanie. Sprawdzenie: `vitest run src/d2jsp`, typy, zrzut ekranu gracza.
4. Strona: `strona.js` karta wg makiety C, `index.html` wykres i galeria; publikacja `sh scripts/d2jsp-publikuj.sh test`. Sprawdzenie: zrzut 2560×1440 z Edge w tle (ciemny wygląd), arkusz obok makiety, klik ▶ i nick w Playwright (bez przejmowania myszki).
5. Przegląd (`przeglad`), commit w trzech repo, `git push moje d2jsp`, pokaz w Brave.

## Odrzucone drogi i ryzyka
- Osobny dokument roku zapisywany przy skoku: odrzucone, bo stare dni na teście trzeba by przeliczyć skryptem z dostępem do bazy; z miesięcy rok wychodzi dokładnie (miesiąc trzyma wszystkie dni).
- Wszystkie skoki okresu naraz: rok to do 6000 skoków; dlatego najpierw dni (jeden dokument okresu), skoki jednego dnia na żądanie (zapytanie po koncie i dniu, bez nowego indeksu).
- Gracz po nicku: kilka kont może mieć ten sam nick; biorę konto widoczne w tabelach z danymi w tym okresie. Ryzyko: dwa zweryfikowane konta o tym samym nicku (bardzo mało prawdopodobne), wtedy pierwsze.
- Ryzyko: łączenie 12 miesięcy przy każdym odczycie tabel; przy małej liczbie graczy tanie, pamięć 60 s.

## Wczesny pokaz
Pierwszy pokaz po kroku 4 (całość naraz, bo karta bez danych z serwera nie ma czego pokazać): Mateusz ocenia kartę i ekran gracza na teście.

## Po krytyku (runda 1, 14.11)
- Rok = suma 200 najlepszych z połączonych map `dni` 12 miesięcy (nie z sum miesięcy), najlepszy skok = najlepszy z miesięcy; czysta funkcja `mergeMonths` z testem.
- Reguła karty (każdy okres): jest zwycięzca poprzedniego okresu → zwycięzca, punkty, ▶, „wyniki końcowe” 5; brak (np. rok 2025) → „jeszcze nieznany”, „przyznanie <koniec>”, „na czele” 5 z bieżącego okresu.
- Gracz wskazywany numerem konta d2jsp (`uid`, każde konto w tabelach go ma), nie nickiem: `?gracz=<uid>&okres=<key>`, serwer szuka konta po `uid`.
- Koniec okresu: serwer wysyła chwilę końca (północ czasu polskiego po ostatnim dniu), strona tylko odejmuje; napis „Koniec: nd 15.11, 24:00 (za …)”.
- Awatary przy nickach na karcie i na ekranie gracza (zasady: „wszędzie w tabelach”).
- Kolejność: strona (krok 4) przed grą (krok 3); ekran gracza bez wzoru, przy pokazie „wymyślony, do oceny”.
- Odrzucone: nic (koszt odczytu roku: zgoda krytyka, bez zmian; zapytanie bez indeksu złożonego: sprawdzi krok 2).

## Rozliczenie (14.11)
| próg / obietnica | wynik | kto zdecydował o zmianie |
|---|---|---|
| karta jak makieta C (arkusz 2560×1440) | zgodna; dodane awatary i ▶ przy każdym nicku (wymaganie zadania, makieta ich nie ma) | zasady (awatary, ▶) |
| ▶ odtwarza skok | na ekranie gracza sprawdzone (Playwright, skok z `&test`); na stronie ▶ dzisiejszych wyszarzone, wczorajszych na teście jeszcze nie ma | — |
| klik w nick → „Skoki gracza” | działa na prawdziwych danych, „Wróć do skoków gracza” wraca na ten sam dzień | — |
| wykres godzinowy | w 24 h ukryty, w 7 dniach „Posty dziennie” zostaje | — |
| smoke z nowymi trasami | 13/13 na lotnik-test | — |
| zwycięzca okresu na prawdziwych danych | niesprawdzone: na teście nie ma jeszcze zamkniętego tygodnia (pierwszy w nocy 15/16.11), tylko podgląd `?tmdemo` | — |

Uwagi krytyka (runda 1): rok z map dni — sprawdziła się (test łączenia miesięcy); reguła karty — sprawdziła się (bez niej rok pokazałby pusty 2025); uid zamiast nicka — sprawdziła się (prostsze wyszukiwanie, bez dwuznaczności); koniec z serwera — sprawdziła się (północ, nie 21:00 jak przy postach); awatary — przyjęte; kolejność kroków — przyjęta. Przegląd: drobne poprawki (odstęp ▶ od punktów, ukośnik w adresie awatara, stare zapisy), bez błędów liczenia.
