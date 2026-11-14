# STAN: Telemark na stronie licznika d2jsp

Ustalenia z Mateuszem (gra, skocznie, punkty, tabele): `docs/zasady_d2jsp.md`. Kod autora: klon https://github.com/visvaya/telemark (gałąź `master` = autor, nasza praca na gałęzi `d2jsp`).

## Stan (14.11.2026)
- Nic nie zbudowane. Ustalenia gotowe, plan `docs/plan_d2jsp.md` do napisania (skill `plan-systemu`).
- Gra: TypeScript + React + Vite, pnpm 12, Node 26.12.1+ (na PC jest Node 24.19, pnpm brak). Licencja GPL-3.0.
- Sprawdzone w kodzie: punkty skoku `src/game/competition-board.ts:63`; skocznie i K `src/hills/own-hills.ts`, `own-hills-large.ts`; wiatr z ziarna (`BorlandRandom`) `src/game/competition-jump.ts:25`; powtórka = skocznia + ziarno + wiatr + wejście co klatkę (`src/storage/original-replay-file.ts:46`, zapis `input-codec.ts`, `replay-store.ts`); README: fizyka deterministyczna na każdym urządzeniu.
- Lotnik: sesja w localStorage (`E:\Vibe coding\lotnik\konto.js:53`, ta sama domena github.io co licznik), serwer kont `lotnik/serwer/konta.js` (/login, /sessions), ranking i weryfikacja `lotnik/docs/gra.md`, publikacja na stronę `lotnik/scripts/publikuj.sh`. Strona licznika: `d2jsp-licznik/docs/index.html`.
- Serwer Lotnika: Cloud Functions gen2, `nodejs22`, `lotnik-test`/`lotnik` (`lotnik/serwer/deploy.sh`, Firestore z przyrostkiem `_test`). Telemark buduje się na Node 26, więc symulacja na serwer musi pójść jako gotowy plik JS (zbudowany), nie TypeScript.
- Decyzja 14.11: przerabiamy grę autora (nie piszemy od nowa). Plan i wykonanie: Opus 5.5 w jednej sesji bez pytań (Mateusz nie chce Fable przez limity).

## Następny krok
- Plan (najpierw najbardziej ryzykowne: czy symulacja skoku Telemarku odtworzy skok na serwerze w Node z tym samym wynikiem). Potem pierwszy pokaz: gra w oknie na stronie /test/ z trzema skoczniami dnia.
