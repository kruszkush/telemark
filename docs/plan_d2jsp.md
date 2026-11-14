# Plan: Telemark na stronie licznika d2jsp

Ustalenia z Mateuszem (zatwierdzone, nie planuję ich od nowa): `docs/zasady_d2jsp.md`. Stan: `STAN.md`. Plan pisany 14.11.2026, wykonanie w tej samej sesji bez Mateusza (decyzje własne w sekcji „Rozstrzygnięte bez Mateusza”).

## Cel (co zobaczy gracz)
Na stronie testowej licznika (https://kruszkush.github.io/d2jsp-licznik/test/) jest przycisk „Telemark”. Klik otwiera grę w dużym oknie na wierzchu strony, krzyżyk wraca na stronę. W menu gry są tylko „Skocznie dnia” i ustawienia. Gracz zalogowany w Lotniku jest od razu zalogowany w Telemarku (inaczej loguje się nickiem i hasłem konta Lotnika albo skacze jako gość). Widzi trzy dzisiejsze skocznie (małą, średnią, mamucią), na każdej 10 skoków z wiatrem wspólnym dla wszystkich; po każdym skoku widzi swoje dzisiejsze miejsce na tej skoczni, a jego nick jest nazwiskiem skoczka. Na stronie pod przyciskiem są tabele: bieżący tydzień, bieżący miesiąc, poprzedni tydzień i poprzedni miesiąc ze zwycięzcą i pucharem; przy każdym wpisie przycisk ▶ odtwarza najlepszy skok gracza.

## Czego ten plan nie robi
- Nie wdraża na prod (serwer `lotnik`, strona główna licznika): tylko na słowa „daj na official”.
- Nie dodaje zabezpieczeń poza jednym: serwer sam odtwarza skok z ruchów. Bez straży, alarmów na Discord i wstrzymywania rekordów (Lotnik je ma, tu świadomie nie).
- Nie zmienia fizyki, skoczni ani punktacji autora. Nie dodaje tabeli dnia na stronie.
- Nie usuwa kodu treningu, powtórek, zawodów i instalacji; tylko chowa je w menu wersji d2jsp.
- Nie przenosi nowości autora (gałąź d2jsp zostaje na wersji 0.25.16).
- Nie zakłada publicznego repozytorium bez słów Mateusza „repo tak”.

## Wzorzec
1. Sposób: sprawdzenie wyniku przez serwer z odtworzenia (gracz wysyła ruchy, serwer liczy skok tą samą fizyką co przeglądarka; podpisany bilet z ziarnem przed skokiem, kontrola czasu po). Działający kod u nas: serwer Lotnika (`lotnik/serwer/index.js` /start i /end, `lotnik/docs/gra.md` „Serwer testowy”). Biorę go w całości: bilet HMAC (`tokMake`/`tokRead`), CORS, hasło testerów, limity IP, konta i sesje (`konta.js` `sessionOf`), klucze okresów (`ranking.js` `periodKeys`), okno nagrań na stronie (`nakladka.js` `.lotnik-nagr`). W spisie sposobów nie ma tego rodzaju problemu: nowy wiersz W1 „wynik gry sprawdzany przez serwer” ze stanem „działa (Lotnik)”.
2. Moduły (każdy z jedną odpowiedzialnością):
   - `telemark/src/d2jsp/daily.ts`: skocznie dnia z daty (te same w grze i na serwerze), dzień w czasie polskim, grupy skoczni.
   - `telemark/src/d2jsp/jump-check.ts`: wynik skoku z (skocznia, ziarno, ruchy) tą samą drogą co trening w grze (`startTrainingJump` + `stepTrainingJump`).
   - `telemark/src/d2jsp/server-entry.ts` + `vite.d2jsp-sim.config.ts`: jeden plik JS dla serwera (Node 22).
   - `telemark/src/d2jsp/api.ts`: rozmowa gry z serwerem i konto (localStorage Lotnika).
   - `telemark/src/d2jsp/daily-screen.tsx` (+ zmiany w `app.tsx`, `menu-screen.tsx`, `jump-screen.tsx`): ekran skoczni dnia, logowanie, skok dnia, miejsce po skoku, oglądanie skoku z `?ogladaj=`.
   - `lotnik/serwer/telemark.js`: trasy `/tm/*` (bilet, zapis i limity, tabele, skok do obejrzenia); `lotnik/serwer/deploy.sh` kopiuje plik symulacji.
   - `telemark/d2jsp/strona.js` + `telemark/scripts/d2jsp-publikuj.sh`: przycisk, okno gry i tabele na stronie licznika; publikacja na /test/.
3. Mapa objaw → moduł:
   - zła skocznia dnia, inna w grze i na serwerze → `daily.ts`;
   - serwer liczy inny wynik niż gra → `jump-check.ts` (albo budowanie pliku symulacji);
   - skok nie zapisany, limit 10 źle liczony, zły wynik dnia, tygodnia albo miesiąca → `serwer/telemark.js`;
   - gra nie widzi konta, nick nie jako skoczek, brak miejsca po skoku → `api.ts` / `daily-screen.tsx`;
   - zła tabela, brak pucharu, ▶ nie działa, okno gry źle na stronie → `strona.js` (dane: `serwer/telemark.js`).
4. Sposób: znany dobry, działający u nas w Lotniku (agent sposob, 14.11). Niesprawdzone przez niego: czy Node 22 liczy jak przeglądarka (krok 1).

## Model danych (Firestore, przyrostek `_test` na teście)
- `tm_skoki/{gid}`: konto, nick, dzień, skocznia (grupa 0–2, id), numer skoku 1–10, ziarno, ruchy (tekst gry `2:…`), metry, punkty (dziesiąte części, liczba całkowita), upadek, czasy biletu i końca, IP (skrót). Bez biletu = nie ma skoku.
- `tm_dni/{d2026-11-14}/gracze/{konto}`: użyte skoki [3], dwa najlepsze skoki na skoczni [3][2] {p, gid, m}, suma skoczni [3], wynik dnia.
- `tm_okresy/{w2026-46 | m2026-11}/gracze/{konto}`: wyniki dni w okresie {dzień: wynik}, suma 5 (tydzień) albo 20 (miesiąc) najlepszych, najlepszy skok okresu (do ▶).
- `tm_puchary/{w2026-46 | m2026-11}`: zwycięzca zamkniętego okresu (zapis przy pierwszym odczycie po końcu okresu).
- Furtki (plan-furtki 14.11, wszystkie wpuszczone, bo tanie teraz): pole `sim` (wersja gry, np. 0.25.16) w bilecie, skoku i odpowiedzi do oglądania, plik symulacji na serwerze nazwany wersją, stare zostają; pole `dev` (przeglądarka i system); tryb `std` w id dokumentów (`tm_dni/std_d…`, `tm_okresy/std_w…`, `tm_puchary/std_w…`) i w bilecie; ziarno = HMAC(sekret, `tm1|tryb|dzień|skocznia|n`); skocznie dnia zapisane w dokumencie dnia przy pierwszym skoku, losowanie skoczni z wersją („od dnia X sposób Y”), serwer wybiera skocznię sam; puchar jako zamrożone podium (10 pierwszych z remisami, `zwyciezcy: [konto]`); okresy z jednej listy `OKRESY = [{w, 5 dni}, {m, 20 dni}]`; `tm_skoki` trzymane w całości, bez kasowania.
- Wszystko w jednej transakcji `/tm/end`. Widoczność (tylko zweryfikowani, bez banów) liczona przy odczycie z kont Lotnika (późna weryfikacja działa bez przeliczania).

## Rozstrzygnięte bez Mateusza (do raportu)
1. Serwer: trasy Telemarku w serwerze Lotnika (`lotnik-test`), nie osobna funkcja: te same konta, sesje, hasło testerów, wdrożenie jednym skryptem.
2. Wiatr skoku nr n: ziarno = HMAC(sekret, dzień|skocznia|n). To samo dla wszystkich, ale nieznane przed skokiem (nie da się ćwiczyć jutrzejszych wiatrów). Skocznie dnia z jawnej daty (nic nie szkodzi, że znane wcześniej; działa też bez serwera dla gościa).
3. Skok jest zużyty w chwili wyjścia na belkę (bilet): przerwany albo zamknięty skok przepada, ten sam wiatr nie wraca. Bilet ważny 2 godziny; skok należy do dnia biletu.
4. Ujemne punkty (dyskwalifikacja na mamucie) liczą się jako 0.
5. Gość: losowy wiatr, bez serwera, bez zapisu, gra pokazuje „Gość, wyniki się nie zapisują”.
6. Na stronie testowej gra wymaga hasła testerów jak Lotnik (bierze zapisane przez Lotnika; bez niego gra pyta o nie albo działa jako gość).
7. Puchar: Lotnik nie pokazuje zwycięzców ani pucharów (sprawdzone: `lotnik/ranking.js`, `nakladka.js`, brak). Biorę puchar strony licznika (`d2jsp-licznik/docs/index.html` `cupSvg`, karta `.champ`): karta zwycięzcy poprzedniego tygodnia i miesiąca z dużym pucharem, małe puchary przy nicku w tabelach za wygrane okresy.
8. Pamięć podręczna aplikacji gry autora (service worker) wyłączona w wersji d2jsp (w okienku na stronie dawałaby stare wersje).
9. Tabele odświeżane z pamięci serwera co 60 s (koszt bazy); miejsce po skoku liczone świeżo.

## Kroki
1. **Najbardziej ryzykowne**: plik symulacji dla serwera. `daily.ts`, `jump-check.ts`, `server-entry.ts`, config budowania; skrypt porównania: 60 skoków automatycznego skoczka (CPU pilot gry) na wszystkich 23 skoczniach, wynik z kodu źródłowego w przeglądarce (Chromium i Firefox przez Playwright, strona z Vite) i z pliku JS w Node 22 (przenośny, jak w chmurze) i Node 26. Sprawdzenie: identyczne metry, punkty i upadek w 100% skoków. Nie wyjdzie → zapis dlaczego, reszta bez zabezpieczenia (serwer wierzy w wynik z gry).
2. Serwer: `lotnik/serwer/telemark.js` + wpięcie w `index.js` + kopia pliku w `deploy.sh`; test lokalny `lotnik/test-telemark.mjs` (funkcje liczące: 2 najlepsze, suma dnia, 5 z tygodnia, 20 z miesiąca, limit 10, klucze okresów) i wdrożenie `sh serwer/deploy.sh test`; próba żywego serwera skryptem (logowanie konta testowego, bilet, skok automatu, zapis, 11. skok odrzucony, podrobiony wynik odrzucony).
3. Gra: tryb d2jsp (`import.meta.env` z budowania `--mode d2jsp`), menu tylko „Skocznie dnia” i ustawienia, bez service workera; `api.ts` (konto z localStorage Lotnika, logowanie, hasło testerów); ekran skoczni dnia; skok dnia z biletem i zapisem; nick jako skoczek; miejsce po skoku; gość. Sprawdzenie: testy gry (`pnpm test` dla zmienionych plików i typy), zrzuty ekranu dnia i skoku.
4. Strona: `d2jsp/strona.js` (przycisk, okno, tabele, puchary, ▶), `scripts/d2jsp-publikuj.sh test`. Sprawdzenie: zrzuty strony 2560×1440 i telefon, klik w przycisk.
5. Oglądanie: gra z `?ogladaj=gid` odtwarza skok (ekran powtórki autora), ▶ w tabeli otwiera je w oknie. Sprawdzenie: zrzut odtworzonego skoku z tabeli, ten sam wynik na końcu.
6. Całość na żywo: próbny skok zalogowanym kontem testowym zagrany w przeglądarce, zapisany do tabeli, widoczny na stronie, obejrzany z ▶. Agent `przeglad`.

Pierwszy pokaz po kroku 6 (Mateusza nie ma, więc całość naraz): Mateusz ocenia okno gry na stronie, skocznie dnia i tabele; jeszcze zepsute: zależnie od wyników kroków.

## Odrzucone drogi i ryzyka
- Osobna funkcja `telemark-test`: czysta, ale dubluje konta, hasło i wdrażanie; odrzucone.
- Serwer wierzy w odległość z gry: odrzucone przez Mateusza (jedno zabezpieczenie).
- TypeScript prosto na serwerze: serwer to Node 22, gra wymaga Node 26 do budowania; idzie gotowy plik JS.
- Ryzyko: inna liczba w Node i przeglądarce (np. Safari, inne funkcje matematyczne). Gra ma własną matematykę (`src/sim/deterministic-math.ts`), autor obiecuje ten sam wynik na każdym urządzeniu; krok 1 to mierzy. Safari na iPhonie nie sprawdzę (brak urządzenia); jeśli kiedyś da inny wynik, serwer odrzuci skok z komunikatem i zapisem w dzienniku odrzuceń.
- Ryzyko: Firestore koszt (bezpiecznik 1 GBP). Tabele z pamięci 60 s, zapis 1 transakcja na skok.
- Ryzyko: gra w ramce (iframe) i blokada myszy (pointer lock) albo pełny ekran; sprawdzi krok 3/4 (`allow="fullscreen; pointer-lock"`).

## Krytyk
Krytyk: tak (ok. 10 plików kodu, fundament z zapisem wyników). 1. runda: `plan-critic` i `krytyk-google` równocześnie, przed nimi `plan-furtki`.

## Rozliczenie
(na koniec wykonania)
