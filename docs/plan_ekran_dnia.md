# Plan: nowy ekran dnia z rekordami skoczni (14.11.2026)

Decyzja i wygląd: `docs/zasady_d2jsp.md` „Punkty i tabele”, wpis „Ekran dnia”; makieta `proto/uklad-dnia/index.html`
(wygląd wymyślony, bez wzoru). Okno do sprawdzeń 1920×950 i telefon 390×844.

## Cel (co zobaczy gracz)
- Na górze nazwa gry „Telemark” z datą i konto; pod nimi tabela (Dzisiaj / Tydzień) jak dziś; pod tabelą nagłówek
  „Skocznie dnia” i trzy karty.
- Karta skoczni: nazwa, „Rekord dnia” i „Rekord skoczni” (najdłuższy skok ze wszystkich dni, z datą) w metrach, z
  awatarem przy nicku; pod kreską „Twoje 2 najlepsze skoki” z 10 kwadracikami zużytych skoków, przy każdym skoku metry,
  słowo „upadek” i punkty; „Razem”; „Skacz” tylko na skoczni z kolejki.
- Rekordy są prawdziwe (serwer testowy), widzi je też gość. Bez rekordu: „Rekord dnia: jeszcze nikt”.
- Ekran dnia w oknie 1920×950 bez przewijania, także z wiadomością po skoku.

## Czego ten plan nie robi
- Przycisku ▶ przy rekordach (wpis rekordu zapamiętuje numer skoku, więc da się to dorobić tanio; furtka).
- Osobistego rekordu gracza na skoczni, rekordu tygodnia, rekordów na stronie licznika.
- Przenoszenia rekordów ze starych skoków testowych (rekordy liczą się od wdrożenia; prod jeszcze nie ruszył).
- Zmian w ekranie skoku, w trybie gościa poza kartą, w skoczni treningowej (zostaje w wierszu „Wynik dnia”).
- Skracania opisu zasad (Mateusz 14.11: zostaje).
- Odświeżania cudzych rekordów na żywo: tabela i rekordy pobierają się przy wejściu na ekran i po własnym skoku (jak
  dziś tabela); gość widzi nowe rekordy po odświeżeniu strony.

## Ustalenie bez Mateusza (do potwierdzenia przy pokazie)
- Skok z upadkiem nie jest rekordem (jak w prawdziwych skokach: rekord skoczni tylko ustany). Do rekordu idzie
  odległość, jaką widać w grze i w tabelach (ucięta do pół metra, `lotnik/serwer/telemark.js` end: `m`).
- Remis odległości: rekord zostaje przy wcześniejszym skoku.
- Konto zbanowane albo niewidoczne w tabelach nie trzyma rekordu: pokazuje się następny w kolejce (stąd lista 5).

## Wzorzec
1. Sposób: agregat przy zapisie (Firebase „write-time aggregation”: przy każdym zapisie wyniku transakcja poprawia
   gotowe podsumowanie, odczyt czyta jeden dokument), jak W2 w spisie sposobów (przy skoku zapis tylko sum, tabele z
   pamięcią 60 s przy odczycie). Rodzaju problemu „rekord w metrach” w spisie nie ma: nowy wiersz W3, stan „nie
   próbowane”.
   - Serwer, `/tm/end` (ta sama transakcja co zapis dnia): dwa dokumenty w nowej kolekcji `'tm_rekordy' + SUFFIX`:
     `MODE + '_h' + hill` (wszystkie dni) i `MODE + '_d' + day + '_g' + g` (dzień). Każdy trzyma listę do 5 graczy
     (najwyżej 1 wpis na konto: dłuższy skok tego samego gracza zastępuje jego wpis) z ich najdłuższym ustanym skokiem
     {m, acc, nick, day, gid, n, sim, t}, `t` = `koniec` skoku (`now()` w `/end`), malejąco, remis: wcześniejszy `t`.
     Gorące dokumenty (krytyk 14.11): wszyscy skaczą dziś na tych samych 3 skoczniach, a dokument czytany w
     transakcji blokuje zapisy innych. Dlatego przed transakcją zwykły odczyt obu dokumentów rekordu i warunek
     „skok wchodzi do piątki albo bije własny wpis”; tylko wtedy dokumenty rekordu idą do `tx.getAll` i są poprawiane
     w transakcji (lista tylko się poprawia, więc skok odrzucony na starszym odczycie i tak by nie wszedł). Większość
     skoków nie dotyka dokumentów rekordu.
     `tm_rekordy` to pamięć podręczna; źródłem prawdy zostaje `tm_skoki` (da się przeliczyć skryptem po `hill ==`).
   - Serwer, `/tm/tabele` (już ma pamięć i czyści ją każdy zapisany skok): skocznie dnia z
     `(await simOf(simVersion)).dailyHillIds(day)` (jak `dzien`), 6 dokumentów jednym `getAll`, odsiew czystą funkcją
     `firstVisible(lista, konta)` (pierwszy wpis konta `ok` albo null), oddaje
     `rekordy: { dzis: [3], skocznia: [3] }`, każdy {hill, nick, uid, m, day} albo null.
   - Gra: jedno pobranie tabel na ekran dnia, wspólne dla tabeli i kart; karta pokazuje rekord tylko, gdy `hill` wpisu
     zgadza się z jej skocznią (ekran otwarty przez północ dostałby rekordy nowych skoczni).
2. Moduły (każdy jedna odpowiedzialność):
   - `lotnik/serwer/telemark.js`: czyste funkcje `top5(list, skok)` (kto wchodzi do piątki) i `firstVisible` (odsiew)
     + zapis w `end` + odczyt w `tabele`.
   - `src/d2jsp/api.ts`: typ odpowiedzi tabel z `rekordy`.
   - `src/d2jsp/week-table.tsx`: bez zmian w roli; pobranie tabel przenosi się do `DailyScreen` (zwykły `useEffect`
     z `version`, jak dziś w `WeekTable`), który daje dane tabeli i kart. Bez osobnego hooka (krytyk: najtańsza
     wersja).
   - `src/d2jsp/hill-card.tsx` (nowy): karta skoczni (rekordy, skoki gracza, kwadraciki, „Skacz”, „Skacz na próbę”
     gościa, „Komplet skoków”). Zastępuje `Hills` z `daily-screen.tsx`.
   - `src/d2jsp/daily-screen.tsx`: tylko kolejność ekranu (nagłówek, tabela, „Skocznie dnia”, karty, wynik i trening).
   - `src/text/d2jsp-text.ts`, `src/d2jsp/d2jsp.css`: napisy i wygląd.
3. Objaw → moduł:
   | Objaw | Poprawiam |
   |---|---|
   | zły rekord, brak rekordu po skoku, upadek jako rekord | `top5` / `end` (serwer) |
   | rekord zbanowanego, rekord nie znika po banie | `tabele` (odsiew) |
   | rekord nie odświeża się po skoku w grze | pobranie tabel w `DailyScreen` (version) |
   | rekord innej skoczni na karcie | karta (porównanie `hill`) |
   | układ karty, napisy, kwadraciki, „upadek” | `hill-card.tsx`, tekst, CSS |
   | kolejność ekranu, przewijanie | `daily-screen.tsx`, CSS |
4. Sposób: znany, u nas nie próbowany (agent `sposob` 14.11). Firebase „write-time aggregations”
   (https://firebase.google.com/docs/firestore/solutions/aggregation, wynik wyszukiwania, strona nie czytana w
   całości): podsumowanie w osobnym dokumencie poprawiane w tej samej transakcji co zapis. Lista piątki i odsiew kont
   są nasze (bez piątki ban posiadacza wymagałby przeliczenia od zera). Po wdrożeniu nowy wiersz W3 w spisie.

## Kroki
1. (15 min) Serwer: `top5` + testy w `lotnik/test-telemark.mjs` (wejście do piątki, upadek nie wchodzi, remis
   wcześniejszy, ten sam skok drugi raz nie dubluje — `/end` bywa powtarzany, 1 wpis na konto: krótszy skok tego
   samego gracza nie zmienia nic, dłuższy zastępuje) i `firstVisible` (zbanowany na 1. miejscu → drugi; wszyscy
   zbanowani → null). Sprawdzenie: `node lotnik/test-telemark.mjs`.
2. (20 min) Serwer: wstępny odczyt + zapis w `end`, odczyt w `tabele`. Sprawdzenie: test jw. + `sh serwer/deploy.sh test`, próbny skok
   (`node scripts/d2jsp-proba.mjs <folder> <grupa>`), odpowiedź `/tm/tabele` ma `rekordy` z tym skokiem;
   `node lotnik/out/tm-smoke.mjs`.
3. (20 min) Gra: typ w `api.ts`, pobranie tabel w `DailyScreen`, `WeekTable` z danymi z zewnątrz. Sprawdzenie:
   typy, oxlint, `vitest run src/d2jsp`.
4. (40 min) Gra: `hill-card.tsx`, nowy porządek `daily-screen.tsx`, tekst, CSS wg makiety. Sprawdzenie: jw. +
   test jednostkowy karty (z rekordem / bez rekordu / rekord innej skoczni pominięty). Pierwszy pomiar wysokości
   już tu, na lokalnej grze z serwerem testowym (skrypt jak w kroku 5, adres localhost).
5. (30 min) Strona testowa: `sh scripts/d2jsp-publikuj.sh test`. Nowy skrypt `scripts/d2jsp-ekran-dnia.mjs` (wzór
   `d2jsp-trening.mjs`: konto próbne, odmowa przejęcia myszki): strona licznika w oknie przeglądarki 1920×950,
   przycisk Telemark, pomiar w dokumencie gry w okienku `.tm-okno iframe` (wysokość okienka = okno − 56 px, czyli
   894 px; `d2jsp/strona.js` `.tm-box`): `scrollHeight ≤ innerHeight` zalogowanego przed i po skoku (z wiadomością),
   i gościa; telefon 390×844 zrzut gry. Arkusz poza `test-results/`: makieta obok gry. Skrypty szukające nagłówka „Skocznie dnia” zostają
   ważne (to teraz nagłówek nad kartami).
6. (15 min) `przeglad` (z makietą i arkuszem), pokaz w Brave, STAN, commit i push w obu repo (`lotnik`: tylko test,
   prod dopiero na „daj na official”).

Razem ok. 2,5 h + krytyk i poprawki: 3–4 h.

## Odrzucone drogi i ryzyka
- Liczenie przy odczycie ze wszystkich skoków (`tm_skoki` po skoczni): rekord skoczni czytałby setki–tysiące
  dokumentów na każde odświeżenie tabel; zapytanie z sortowaniem po `m` wymaga indeksu złożonego Firestore (lotnik nie
  ma pliku indeksów). Odrzucone.
- Rekord dnia z dokumentów dnia (`b0..b2`): tam są 2 najlepsze skoki gracza **po punktach**, najdłuższy skok może tam
  nie być. Odrzucone.
- Jeden rekord zamiast piątki: po banie posiadacza nie byłoby kogo pokazać. Odrzucone.
- Ryzyko: skok bijący rekord czyta w transakcji 2 dodatkowe wspólne dokumenty; gdy dwóch graczy naraz bije rekord tej
  samej skoczni, jedna transakcja się powtórzy. Zmniejsza to wstępny odczyt (Wzorzec); `tm-smoke` skacze jednym
  kontem, więc tego nie zmierzy, a ruch forum jest mały: zostawiam bez pomiaru, w zapisie ryzyka.
- Ryzyko: karta z rekordami jest wyższa; w makiecie ekran ma 790 px. W 1920×950 zapas ok. 160 px; sprawdza krok 5.

## Wczesny pokaz
Pierwszy pokaz po kroku 5: Mateusz ocenia nowy ekran z prawdziwymi rekordami na stronie testowej; jeszcze nie ma:
▶ przy rekordach (poza planem). Kroki 1–2 nie mają obrazu, a rekordy bez serwera byłyby zmyślone, więc serwer idzie
pierwszy.

## Furtki (agent `plan-furtki` 14.11)
Wpuszczone teraz (w Wzorcu): 1 wpis na konto w piątce (inaczej po banie jednego gracza z całą piątką karta mówi
„jeszcze nikt”), klucze z `MODE`, we wpisie `n`, `sim` i `t` (odsianie rekordów po zmianie fizyki, remis po czasie).
Zanotowane:
- ▶ przy rekordzie: `gid` we wpisie wystarczy; dzisiejszy rekord da się obejrzeć dopiero od jutra (`/tm/skok`
  odmawia dzisiejszych skoków, wspólny wiatr), karta musi wtedy mówić „od jutra”.
- Kasowanie oszukanego skoku przez admina: przeliczenie dnia, okresów i rekordów jednym skryptem z `tm_skoki`.
- Później, zwykła praca: rekord osobisty na skoczni, „Nowy rekord skoczni!” po skoku (flaga w odpowiedzi `/end`,
  zapisana w skoku przez powtórzone `/end`), tablica 5 rekordzistów skoczni, czwarta skocznia dziennie.

## Krytyk
Krytyk: tak (6 plików kodu w 2 repo, zapis na serwerze). Runda 1 (14.11, `plan-critic`): „wymaga poprawek”.
Przyjęte: wstępny odczyt przed transakcją (gorące dokumenty), `hill` we wpisie i sprawdzenie w karcie (północ),
`firstVisible` z testem (ban), miejsce pomiaru przewijania (okienko gry na stronie, 894 px), `t` = koniec skoku,
skocznie dnia w `tabele` z `dailyHillIds`, bez hooka `useTables`, brak odświeżania na żywo w „Czego nie robi”,
pierwszy pomiar wysokości już w kroku 4. Odrzucone: nic. Krytyk: „model serwera jest już minimalny, plan nie jest
przekombinowany”. Bez 2. rundy: poprawki nie zmieniają sposobu (ten sam agregat przy zapisie), tylko go zawężają.

## Rozliczenie
(na koniec wykonania)
