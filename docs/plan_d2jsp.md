# Plan: Telemark na stronie licznika d2jsp

Ustalenia z Mateuszem (zatwierdzone, nie planuję ich od nowa): `docs/zasady_d2jsp.md`. Stan: `STAN.md`. Plan 14.11.2026, po 1. rundzie krytyków; wykonanie w tej samej sesji bez Mateusza (decyzje własne w sekcji „Rozstrzygnięte bez Mateusza”).

## Cel (co zobaczy gracz)
(Wygląd strony od 14.11: `docs/zasady_d2jsp.md` „Strona licznika”, makieta C.) Na stronie testowej licznika (https://kruszkush.github.io/d2jsp-licznik/test/) jest przycisk „Telemark”. Klik otwiera grę w dużym oknie na wierzchu strony, krzyżyk wraca na stronę. W menu gry są tylko „Skocznie dnia” i ustawienia. Gracz zalogowany w Lotniku jest od razu zalogowany w Telemarku (inaczej loguje się nickiem i hasłem konta Lotnika albo skacze jako gość). Widzi trzy dzisiejsze skocznie (małą, średnią, mamucią), na każdej 10 skoków z wiatrem wspólnym dla wszystkich; po każdym skoku widzi swoje dzisiejsze miejsce na tej skoczni, a jego nick jest nazwiskiem skoczka. Na stronie pod przyciskiem są tabele: bieżący tydzień, bieżący miesiąc, poprzedni tydzień i poprzedni miesiąc ze zwycięzcą i pucharem; przy wpisie przycisk ▶ odtwarza najlepszy skok gracza w tym okresie.

## Czego ten plan nie robi
- Nie wdraża na prod (serwer `lotnik`, strona główna licznika): tylko na słowa „daj na official”.
- Nie dodaje zabezpieczeń poza jednym: serwer sam odtwarza skok z ruchów. Bez straży, alarmów na Discord i wstrzymywania rekordów.
- Nie zmienia fizyki, skoczni ani punktacji autora. Bez tabeli dnia na stronie.
- Nie usuwa kodu treningu, powtórek, zawodów i instalacji; chowa je w menu wersji d2jsp.
- Nie przenosi nowości autora (gałąź d2jsp zostaje na wersji 0.25.16).
- Nie zakłada publicznego repozytorium bez słów Mateusza „repo tak”.

## Wzorzec
1. Sposób: wynik sprawdzany przez serwer z odtworzenia (spis sposobów W1, działa w Lotniku): podpisany bilet HMAC z ziarnem przed skokiem, po skoku ruchy gracza, serwer liczy skok tą samą fizyką co gra (plik JS zbudowany z kodu gry), kontrola czasu od biletu, bilet raz. Kod biorę z Lotnika: `lotnik/serwer/index.js` (`tokMake`/`tokRead`, CORS, hasło testerów, limity IP, ponowienie /end po zgubionej odpowiedzi), `konta.js` (`sessionOf`), `ranking.js` (`periodKeys` + dopisany klucz miesiąca), okno nagrań `lotnik/nakladka.js` (`.lotnik-nagr`), kolejka /end w localStorage (`nakladka.js` PENDING_KEY). Porównanie fizyki między silnikami: test autora `e2e/sim-engines.spec.ts` + `e2e/sim-harness` (rozszerzam, nie piszę od nowa).
2. Moduły (każdy z jedną odpowiedzialnością):
   - `src/d2jsp/daily.ts`: dzień w czasie polskim, grupy skoczni, skocznie dnia z daty (gość i podgląd; zalogowany dostaje skocznie z serwera, który liczy je tym samym kodem).
   - `src/d2jsp/jump-check.ts`: wynik skoku z (skocznia, ziarno, ruchy) tą samą drogą co trening (`startTrainingJump` z `presentation = true` + `stepTrainingJump`), wynik w klatce lądowania (`logic.finished`), jak `jump-round.ts:60`.
   - `src/d2jsp/server-entry.ts` + `vite.d2jsp-sim.config.ts`: jeden plik ES dla serwera (Node 22), nazwany wersją gry.
   - `src/d2jsp/api.ts`: rozmowa z serwerem, konto i hasło testerów z localStorage Lotnika (test: `lotnik.konto`, `lotnik.haslo`; prod: przedrostek `p.`; format `{token, konto}` jak `lotnik/konto.js:53`), kolejka nie wysłanych skoków.
   - `src/d2jsp/daily-screen.tsx` + małe zmiany w `app.tsx`, `menu-screen.tsx`, `jump-runs.ts`/`jump-screen.tsx`: ekran dnia, logowanie, skok dnia, miejsce po skoku, oglądanie `?ogladaj=`.
   - `lotnik/serwer/telemark.js`: trasy `/tm/dzien`, `/tm/start`, `/tm/end`, `/tm/tabele`, `/tm/skok`; leniwy import pliku symulacji; włączone zmienną `TELEMARK=1` tylko w `deploy.sh test`.
   - `d2jsp/strona.js` + `scripts/d2jsp-publikuj.sh`: przycisk, okno gry, tabele, puchary, ▶ na stronie licznika; publikacja na /test/.
3. Mapa objaw → moduł:
   - zła skocznia dnia → `daily.ts`;
   - serwer liczy inny wynik niż gra → `jump-check.ts` (albo budowanie pliku);
   - skok nie zapisany, limit 10, zły wynik dnia, tygodnia, miesiąca, puchar → `serwer/telemark.js`;
   - gra nie widzi konta, zgubiony skok przy złym internecie → `api.ts`;
   - nick nie jako skoczek, brak miejsca po skoku, restart w trybie dnia → `daily-screen.tsx` / zmiany w pętli skoków;
   - zła tabela na stronie, ▶, okno gry → `strona.js`.
4. Sposób: znany dobry, działający u nas w Lotniku (agent sposob, 14.11). Niesprawdzone przez niego: czy Node 22 liczy jak przeglądarka (krok 1).

## Przebieg skoku dnia (gra i serwer)
1. Ekran dnia (zalogowany, zweryfikowany): `/tm/dzien` daje skocznie, użyte skoki i najlepsze dwa na każdej; przycisk „Skacz (n/10)” przy skoczni.
2. Klik „Skacz”: `/tm/start` w transakcji podbija `uzyte` tej skoczni (odmowa przy 10) i daje bilet {gid, tryb `std`, dzień, grupa, id skoczni, n, ziarno, `sim`, czas}. Dopiero z biletem gra otwiera skok z tym ziarnem (do tego czasu „Pobieram wiatr…”; bez odpowiedzi: komunikat i powrót, skok nie przepada, jeśli bilet nie przyszedł).
3. W trybie dnia nie ma „od nowa”, ducha rekordu ani nowego skoku kliknięciem: po skoku klik wraca na ekran dnia (mechanizm `contestNext` z `jump-runs.ts`). Przerwany skok (zamknięcie okna, wyjście do menu) przepada: bilet wydany, wynik 0.
4. W klatce lądowania (wynik ustalony, `jump-round.ts:60`) gra wkłada skok do kolejki w localStorage i wysyła `/tm/end` {bilet, ruchy, urządzenie}; przy błędzie sieci ponawia (też po ponownym otwarciu gry). Serwer odtwarza, sprawdza czas (klatki/70 ≤ czas od biletu + 2 s, zastąpione 14.11, było 30 s; bilet ważny 10 min), zapisuje w jednej transakcji i odsyła wynik, miejsce dziś na tej skoczni i sumy. Drugi /end z tym samym biletem i tymi samymi ruchami dostaje tę samą odpowiedź (Lotnik `index.js:320`).
5. Gra pokazuje wynik z serwera; inny niż w grze → ostrzeżenie „serwer policzył inaczej” i zapis w dzienniku odrzuceń.
6. Gość i konto niezweryfikowane: losowy wiatr, bez serwera, bez zapisu, napis o tym na ekranie dnia.

## Model danych (Firestore, przyrostek `_test` na teście; bez kasowania)
- `tm_skoki/{gid}`: tryb, konto, nick, dzień, grupa, id skoczni, n, ziarno, `sim`, `dev`, ruchy (tekst gry `2:…`), metry, punkty (dziesiąte części, liczba całkowita, ujemne → 0), upadek, czasy, IP (skrót), `koniec` (bez = bilet bez skoku).
- `tm_dni/std_{d2026-11-14}/gracze/{konto}`: `u0,u1,u2` (użyte), `b0,b1,b2` (lista do 2 map {p, gid, m}), `s0,s1,s2` (suma dwóch najlepszych), `wynik` (suma s0+s1+s2), nick.
- `tm_okresy/std_{w2026-46 | m2026-11}/gracze/{konto}`: `dni` {dzień: wynik}, `suma` (5 albo 20 najlepszych dni, lista `OKRESY`), `best` {p, gid, m, hill} (do ▶), nick.
- `tm_puchary/std_{w… | m…}`: podium (10 pierwszych z remisami) i `zwyciezcy: [konto]`, zapis `create` przy pierwszym odczycie po końcu okresu + 15 min (bilet 10 min).
- Okres skoku = dzień biletu (`g.t`), nie końca.
- Widoczność (tylko zweryfikowani, bez bana) liczona przy odczycie z kont Lotnika (pamięć instancji 60 s). Powód odejścia od wzoru Lotnika (pole tylko u widocznych + `syncAcc`): gracze nie przechodzą z niezweryfikowanych, bo niezweryfikowani nic nie zapisują, więc filtr dotyczy tylko banów i usuniętych kont; kilkadziesiąt dokumentów na tabelę.

## Rozstrzygnięte bez Mateusza (do raportu)
1. Serwer: trasy Telemarku w serwerze Lotnika (`lotnik-test`), leniwy import, włączone zmienną tylko na teście (późniejsze wdrożenie Lotnika na prod ich nie włączy; zastąpione 15.11: `deploy.sh prod` włącza je też na prod, Telemark na stronie głównej).
2. Wiatr skoku n: ziarno = HMAC(sekret, `tm1|std|dzień|grupa|n`), to samo dla wszystkich, nieznane przed wydaniem biletu.
3. Skok zużyty w chwili wydania biletu (przerwany przepada).
4. Konto niezweryfikowane skacze jak gość (losowy wiatr, bez zapisu): inaczej darmowe drugie konto pozwalałoby poznać dzisiejsze wiatry przed skokiem.
5. ▶ przy skoku z bieżącego dnia działa dopiero po końcu dnia (ten sam powód). Znane ograniczenie: zweryfikowany kolega może podać ziarno; zostaje, bo wspólny wiatr to decyzja Mateusza.
6. Ujemne punkty (dyskwalifikacja na mamucie) liczą się jako 0.
7. Na stronie testowej gra wymaga hasła testerów jak Lotnik (bierze zapisane przez Lotnika; bez niego gra pyta).
8. Puchar: Lotnik nie pokazuje zwycięzców ani pucharów (sprawdzone w `lotnik/ranking.js`, `nakladka.js`: brak). Biorę puchar strony licznika (`d2jsp-licznik/docs/test/index.html` `cupSvg`, karta `.champ`): karta zwycięzcy poprzedniego tygodnia i miesiąca z dużym pucharem, małe puchary przy nicku w tabelach.
9. Service worker autora wyłączony w wersji d2jsp i jawnie wyrejestrowany (`unregister`).
10. Tabele z pamięci serwera 60 s; miejsce po skoku liczone świeżo z dokumentów dnia.
11. Gdy krok 1 nie wyjdzie: wg promptu Mateusza 14.11 („zapisz dlaczego i zrób resztę bez tego zabezpieczenia”) serwer przyjmie wynik z gry, a raport powie to na początku (odrzucona uwaga obu krytyków, dowód: prompt).

## Kroki
1. **Najbardziej ryzykowne**: plik symulacji dla serwera. `daily.ts`, `jump-check.ts`, `server-entry.ts`, config budowania; zestaw skoków: na każdej z 23 skoczni po kilka skoków automatu (CPU pilot gry) i skoki z losowymi ruchami (upadki, dyskwalifikacje), razem ≥ 150; wyniki z Node 22 z pliku serwera zapisane do pliku; nowy test e2e obok `sim-engines.spec.ts`: ten sam plik w Chromium, Firefox i WebKit daje te same metry, punkty i upadek; plus ten sam zestaw z kodu źródłowego w Node 26 (vitest). Sprawdzenie: 100% zgodnych.
2. Serwer: `lotnik/serwer/telemark.js`, wpięcie w `index.js`, `deploy.sh` (kopiuje pliki `serwer/telemark/*.mjs`, brak = ostrzeżenie), test `lotnik/test-telemark.mjs` (2 najlepsze, wynik dnia, 5 z tygodnia, 20 z miesiąca, klucze okresów z miesiącem, puchar z remisem), wdrożenie `sh serwer/deploy.sh test`, próba żywego serwera skryptem: dwa konta testowe dostają ten sam wiatr w skoku n; bilet bez /end, potem następny ma n+1; 11. odmowa; ponowiony /end ta sama odpowiedź; podrobione ruchy i za szybki koniec odrzucone; czas powtórki w chmurze.
3. Gra: tryb d2jsp (`vite build --mode d2jsp`, base `./`), menu, `api.ts`, ekran dnia, skok dnia wg „Przebiegu”, nick jako skoczek (litery spoza czcionki gry zamienione), miejsce po skoku, gość. Sprawdzenie: typy, testy zmienionych plików, zrzuty ekranu dnia i skoku (lokalnie na porcie 88xx, CORS serwera testowego).
4. Strona: `d2jsp/strona.js`, `scripts/d2jsp-publikuj.sh test` (kopia `dist` do `docs/test/telemark/`, znacznik skryptu raz). Okno: iframe z fokusem po otwarciu, ✕ zamyka, Escape należy do gry; strona pod spodem schowana jak `body.lt-nagr-on`. Sprawdzenie: zrzuty 2560×1440 i telefonu, klik w przycisk.
5. Oglądanie: gra z `?ogladaj=gid` odtwarza skok ekranem powtórki autora; ▶ w tabeli otwiera to w oknie. Sprawdzenie: zrzut odtworzonego skoku, wynik na końcu taki jak w tabeli.
6. Całość na żywo: próbny skok zagrany w przeglądarce kontem testowym, zapis, tabela na stronie, ▶ (dla testu wpis z poprzedniego dnia albo przełącznik testu). Agent `przeglad`.

Pierwszy pokaz po kroku 6 (Mateusza nie ma, więc całość naraz): Mateusz ocenia okno gry na stronie, skocznie dnia i tabele.

## Odrzucone drogi i ryzyka
- Osobna funkcja `telemark-test`: dubluje konta, hasło i wdrażanie; odrzucone. Koszt wspólnej: kolejka z Lotnikiem (max 4 instancje, 1 zapytanie naraz), wdrożenie testu Telemarku wdraża też bieżący Lotnik (jego repo jest czyste).
- Liczenie tabel z `tm_skoki` przy każdym odczycie zamiast zbiorczych dokumentów: tysiące odczytów na tabelę; odrzucone.
- Gra wpięta prosto w stronę licznika zamiast ramki: React i style gry mieszałyby się ze stroną; odrzucone.
- Serwer wierzy w odległość z gry: tylko jako wyjście awaryjne z punktu 11.
- Ryzyko: inny wynik w Safari na prawdziwym iPhonie (WebKit z Playwrighta jest najbliżej, ale to nie to samo). Wtedy serwer odrzuci skok z komunikatem i zapisem w dzienniku.
- Ryzyko: koszt Firestore (bezpiecznik 1 GBP): 1 transakcja na start i na koniec skoku, tabele z pamięci 60 s.
- Ryzyko: blokada myszy w ramce; sprawdzi krok 4.

## Krytyk
Krytyk: tak (ok. 10 plików kodu, fundament z zapisem wyników). 1. runda 14.11: `plan-critic` i `krytyk-google` (obaj: wymaga poprawek). Przyjęte: zapis przy bilecie, model bez tablic w tablicach, krótki bilet i puchar po czasie biletu, ziarno widoczne dla drugiego konta (pkt 4–5), WebKit i skoki losowe, przebieg skoku w pętli gry, ponawianie /end, 70 klatek/s, leniwy import i włączanie zmienną, klucz miesiąca, POST z hasłem, port 88xx, skocznia z biletu, klucze localStorage, wyrejestrowanie service workera. Odrzucone: „stop przy porażce kroku 1” (dowód: prompt Mateusza 14.11), „widoczność wzorem Lotnika” (powód w modelu danych), wycięcie `std`/`dev` (zostają, koszt jednego pola). Uproszczone wg krytyków: bez zapisu skoczni w dokumencie dnia i bez wersji losowania skoczni. 2. runda: tylko jeśli wykonanie zmieni sposób.

## Rozliczenie (14.11.2026, wykonanie w jednej sesji bez Mateusza)

| Próg | Wynik | Kto zdecydował o zmianie |
|---|---|---|
| Krok 1: 100% zgodnych skoków serwer = gra | 184/184 w Node 22/24/26, Chromium, Brave, WebKit (komputer, iPhone), Firefox | bez zmiany |
| Kontrola czasu: klatki/70 ≤ czas od biletu + 30 s | zmienione na + 2 s: przy 30 s kontrola nic nie łapała (skok trwa 15–25 s) | ja, w kroku 2 |
| Krok 2: próba żywego serwera | 11/11 (`lotnik/out/tm-smoke.mjs`), powtórka skoku w chmurze 12–23 ms | bez zmiany |
| Odległość w tabelach | serwer zapisywał dokładną (72,8 m), gra pokazuje do pół metra (72,5 m); teraz serwer zapisuje jak gra, dokładną obok | ja, po zrzucie w kroku 5 |
| Punkty z `/tm/dzien` | podawał dziesiąte części, odpowiedź po skoku całe punkty; ujednolicone | ja, w kroku 3 |
| Krok 3–6: próbny skok w przeglądarce, tabela, ▶ | zagrany kontem próbnym, zapis, miejsce po skoku, wiersz w tabeli, ▶ odtwarza z tymi samymi punktami (dzisiejszy przez ukryte `&test` tylko na serwerze testowym) | bez zmiany |

Odstępstwa od planu: puchar zwycięzcy poprzedniego okresu jako linia z większym pucharem nad tabelą, nie osobna karta `.champ` (zwycięzców jeszcze nie ma, więc nie do obejrzenia); budowanie osobnym configiem `vite.d2jsp.config.ts` zamiast `--mode d2jsp`; po skoku obraz gry mówi „kliknij: jeszcze raz”, a klik wraca do listy skoczni (tak samo w zawodach autora, zostawione).

Uwagi krytyków przyjęte do planu:
- zapis przy bilecie (skok zużyty od razu): sprawdziła się (żywy serwer: bilet bez końca daje następnemu n+1);
- model bez tablic w tablicach: sprawdziła się (Firestore odrzuca tablicę w tablicy, pierwotny model by nie działał);
- krótki bilet i puchar po czasie biletu: nie do oceny (pierwszy puchar po końcu tygodnia);
- ziarno widoczne dla drugiego konta (niezweryfikowany jak gość, ▶ od jutra): nie do oceny (wdrożone, bez prób obejścia);
- WebKit i skoki losowe w zestawie: sprawdziła się w tym sensie, że upadki i dyskwalifikacje przeszły tę samą drogą; różnic nie znalazły;
- przebieg skoku w pętli gry (wysyłka w klatce lądowania): sprawdziła się;
- ponawianie /end i ta sama odpowiedź: sprawdziła się (żywy serwer);
- 70 klatek/s: sprawdziła się (kontrola czasu liczy dobrze);
- leniwy import i włączanie zmienną: sprawdziła się (Lotnik test-ranking i test-straz bez zmian);
- klucz miesiąca: sprawdziła się (tabela miesiąca działa);
- POST z hasłem testerów: sprawdziła się (bez hasła 403 i formularz w grze);
- port 88xx: sprawdziła się (CORS serwera testowego wpuszcza tylko 88xx);
- skocznia z biletu: sprawdziła się;
- klucze localStorage jak Lotnik: sprawdziła się (ten sam klucz `lotnik.konto`, `lotnik/konto.js:83`);
- wyrejestrowanie service workera: nie do oceny (pod tym adresem nigdy go nie było).

## Dopisek 14.11: automatyczna kolejność skoczni (decyzja Mateusza, zasady_d2jsp.md „Skocznie i skoki”)
- Gra wybiera skocznię: ta, na której gracz ma najmniej pełnych par skoków (liczba skoków / 2 w dół), przy remisie pierwsza z kolei; skocznie z 10 skokami odpadają. Daje 2-2-2 od zera i wyrównuje dni zaczęte jeszcze wolnym wyborem. Logika w `src/d2jsp/next-hill.ts` (test obok).
- Ekran: przycisk „Skacz” tylko w karcie skoczni z kolejki, ta karta wyróżniona żółtą ramką (wzór: ramka podświetlenia `--accent` w grze autora); pozostałe karty pokazują tylko wyniki. Gość dalej wybiera skocznię do skoku na próbę (trening bez zapisu).
- Serwer kolejności nie pilnuje: skok spoza kolejki wysłany z pominięciem gry nic nie daje (te same skoki, ten sam wiatr, liczą się 2 najlepsze), więc pilnowanie byłoby kosztem bez zysku.
- Sprawdzenie: test jednostkowy kolejki; skoki robotem na stronie testowej i zrzut po każdym, czy ramka przeszła dalej.
