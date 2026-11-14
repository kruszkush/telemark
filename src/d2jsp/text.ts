/** Teksty trybu „Skocznie dnia” na stronie licznika d2jsp (ustalenia: docs/zasady_d2jsp.md). */

const pts = (p: number) => p.toFixed(1).replace(".", ",");
const meters = (m: number) => m.toFixed(1).replace(".", ",");

export const D2_TEXT = {
  title: "Skocznie dnia",
  rules:
    "Codziennie 3 nowe skocznie. Na każdej 10 skoków, każdy na innym wietrze, ale tym samym dla wszystkich. Liczą się 2 najlepsze skoki ze skoczni, wynik dnia to suma z trzech skoczni.",
  groups: ["Mała", "Średnia", "Mamucia"] as const,
  loading: "Wczytywanie skoczni dnia…",
  offline: "Brak połączenia z serwerem. Spróbuj za chwilę.",
  retry: "Spróbuj ponownie",
  newVersion: "Jest nowa wersja gry. Odśwież stronę (F5), żeby skoki się liczyły.",
  loggedAs: (nick: string) => `Skaczesz jako ${nick}.`,
  logout: "Wyloguj",
  loginTitle: "Logowanie kontem Lotnika",
  nick: "Nick",
  password: "Hasło",
  login: "Zaloguj",
  loggingIn: "Logowanie…",
  testerPassword: "Hasło testerów (strona testowa)",
  testerSave: "Zapisz hasło testerów",
  testerNeeded: "Serwer testowy wymaga hasła testerów.",
  guestNote: "Bez konta skaczesz na losowym wietrze, a skoki nie trafiają do tabel.",
  used: (n: number, limit: number) => `Skoki: ${n} z ${limit}`,
  best: (list: readonly { m: number; p: number; fell?: boolean }[]) =>
    list.length === 0
      ? "Jeszcze bez skoku."
      : "Najlepsze: " +
        list.map((j) => `${meters(j.m)} m (${pts(j.p)} pkt)${j.fell === true ? ", upadek" : ""}`).join(" i ") +
        ".",
  hillSum: (p: number) => `Razem na skoczni: ${pts(p)} pkt`,
  jump: (n: number, limit: number) => `Skacz (skok ${n} z ${limit})`,
  allUsed: "Wszystkie skoki na dziś wykorzystane.",
  trial: "Skacz na próbę",
  dayTotal: (p: number) => `Wynik dnia: ${pts(p)} pkt`,
  starting: "Wychodzisz na belkę…",
  usedNote: "Skok liczy się od wyjścia na belkę: wyjście z gry albo zamknięcie strony w trakcie zużywa go.",
  settings: "Ustawienia",
  howTo: "Jak skakać",
  about: "O grze i autorze",
  exit: "Wróć do skoczni dnia (ten skok przepada)",
  exitTrial: "Wróć do skoczni dnia",
  sending: "Wysyłanie skoku do serwera…",
  saved: (m: number, p: number, place: number, of: number, group: string) =>
    `Zapisany skok: ${meters(m)} m, ${pts(p)} pkt. Dzisiaj na skoczni (${group.toLowerCase()}): miejsce ${place} z ${of}.`,
  differs: (game: number, server: number) =>
    `Uwaga: gra policzyła ${pts(game)} pkt, serwer ${pts(server)} pkt. Liczy się wynik serwera.`,
  trialResult: (m: number, p: number) => `Skok na próbę: ${meters(m)} m, ${pts(p)} pkt (bez zapisu).`,
  watchTitle: (nick: string, day: string) => `Skok: ${nick}, ${day}`,
  watchError: "Nie udało się wczytać skoku.",
  watchBack: "Zamknij",
  points: pts,
  meters,
};
