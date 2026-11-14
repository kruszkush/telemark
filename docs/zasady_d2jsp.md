# Telemark na stronie licznika d2jsp: ustalenia z Mateuszem

Jedyne miejsce tych ustaleń (14.11.2026). Plan wykonania: `docs/plan_d2jsp.md` (do napisania). Stan: `STAN.md`.

## Strona i gra
- Przycisk „Telemark” na stronie licznika (https://kruszkush.github.io/d2jsp-licznik/). Gra otwiera się w tej samej karcie, jako duże okno na wierzchu strony (jak okno nagrań Lotnika), krzyżyk wraca na stronę. Bez osobnego okna przeglądarki.
- W menu tylko „Skocznie dnia” i ustawienia. Trening, powtórki, zawody z komputerem i instalacja jako aplikacja schowane (kod może zostać).
- Logowanie kontem Lotnika (nick + hasło, to samo konto). Zalogowany w Lotniku na tej stronie jest od razu zalogowany w Telemarku. Nick gracza widać jako nazwisko skoczka przy skoku i w wynikach.

## Skocznie i skoki
- Codziennie 3 losowe skocznie: mała (K50–K95, 7 skoczni), średnia (K100–K170, 8), mamucia (K185–K300, 8); tylko wbudowane skocznie gry.
- Zalogowany: 10 skoków na skoczni dziennie (30 razem). Każdy z 10 skoków ma inny wiatr, ale ten sam dla wszystkich (np. 4. skok na mamuciej ma dziś u każdego ten sam wiatr).
- Gość (bez konta): może skakać, na losowym wietrze (nie dziennym, żeby nie ćwiczył dzisiejszych skoków), bez zapisu w tabeli.
- W tabelach tylko konta zweryfikowane przez d2jsp (jak w Lotniku).

## Punkty i tabele
- Punkty skoku jak liczy gra (jak w prawdziwych skokach: 60 za skok na K, od K145 120, metry za K razy przelicznik, noty sędziów). Mamuty dają więcej punktów (ok. 1,5 raza) i tak zostaje (decyzja Mateusza; odrzucone: punkty Pucharu za miejsca, procent najlepszego wyniku, stałe przeliczniki).
- Na skoczni liczą się 2 najlepsze skoki z 10, dodane (jak dwie serie). Wynik dnia = suma z 3 skoczni.
- Tydzień: suma 5 najlepszych dni gracza. Miesiąc: suma 20 najlepszych dni. Obie tabele rosną na bieżąco (po 3 dniach są zliczone 3 dni).
- Na stronie: bieżący tydzień, bieżący miesiąc, poprzedni tydzień i poprzedni miesiąc ze zwycięzcą. Zwycięzca tygodnia i miesiąca dostaje puchar (pokazać tak, jak Lotnik pokazuje swoje; jeszcze nie sprawdzone jak). Osobnej tabeli dnia na stronie nie ma.
- W grze po każdym skoku: dzisiejsze miejsce na tej skoczni.

## Oglądanie skoków i zabezpieczenie
- Przy wpisach w tabelach przycisk, który odtwarza skok (powtórka gry), zwłaszcza rekordy. To jest główny „anti-cheat”: ludzie widzą, jak ktoś skoczył.
- Jedno zabezpieczenie: serwer nie wierzy w odległość z przeglądarki, dostaje ruchy gracza, sam odtwarza skok i liczy punkty (jak Lotnik). Nic więcej.

## Ustalone poza grą
- Nasza wersja zostaje na jednej wersji autora; jego nowości tylko świadomie przeniesione. Licencja GPL-3.0: nasza wersja publiczna z kodem, autor i licencja zostają w grze.
