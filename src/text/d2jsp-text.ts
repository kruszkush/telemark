/** Teksty trybu „Skocznie dnia” na stronie licznika d2jsp (ustalenia: docs/zasady_d2jsp.md). */

const pts = (p: number) => p.toFixed(1).replace(".", ",");
const meters = (m: number) => m.toFixed(1).replace(".", ",");

export const D2_TEXT = {
  title: "Skocznie dnia",
  rules:
    "Codziennie 3 nowe skocznie. Na każdej 10 skoków, każdy na innym wietrze, ale tym samym dla wszystkich. Gra sama wybiera skocznię: po 2 skoki na każdej, po kolei. Liczą się 2 najlepsze skoki ze skoczni, wynik dnia to suma z trzech skoczni.",
  groups: ["Mała", "Średnia", "Mamucia"] as const,
  loading: "Wczytywanie skoczni dnia…",
  offline: "Brak połączenia z serwerem. Spróbuj za chwilę.",
  noConnection: "Brak połączenia z serwerem.",
  loginFailed: "Nie udało się zalogować.",
  jumpRefused: "Serwer nie przyjął skoku.",
  jumpLost: "Skok nie dotarł do serwera w 10 minut i przepadł.",
  retry: "Spróbuj ponownie",
  newVersion: "Jest nowa wersja gry. Odśwież stronę (F5), żeby skoki się liczyły.",
  loggedAs: (nick: string) => `Skaczesz jako ${nick}.`,
  logout: "Wyloguj",
  loginTitle: "Konto: zaloguj się albo załóż",
  nick: "Nick",
  password: "Hasło",
  login: "Zaloguj",
  loggingIn: "Logowanie…",
  register: "Załóż konto",
  registering: "Zakładanie konta…",
  loginHint:
    "Konto Lotnika działa też tutaj. Nie masz go? Wpisz nick taki sam jak na d2jsp i hasło (min. 6 znaków), potem „Załóż konto”.",
  // Weryfikacja konta jak w Lotniku (lotnik/konto.js: showAccount).
  unverified: "⚠ Konto niezweryfikowane",
  unverifiedWhy: "Skoki dnia liczą się dopiero po weryfikacji. Do tego czasu skaczesz na próbę.",
  copyHint: "kliknij kod, aby skopiować",
  verifyHow: "Wklej kod w nowym poście w temacie licznika na forum d2jsp. Sprawdzenie trwa około 2 godzin.",
  sameNick: "NICK MUSI BYĆ TAKI SAM JAK NA D2JSP",
  verify: "Zweryfikuj",
  verifyMore:
    "„Zweryfikuj” kopiuje kod i otwiera temat licznika na forum. Edycji starego posta nie widać, musi być nowy post.",
  verifyPending: "⏳ Weryfikacja w toku",
  verifyPendingHow: "Zwykle trwa około 2 godzin. Nic więcej nie musisz robić.",
  verifySlow:
    "Długo to trwa. Sprawdź, czy nick na d2jsp jest taki sam jak tu i czy kod jest w nowym poście (edycji nie widać).",
  verifyAgain: "Otwórz temat jeszcze raz",
  codeLabel: "kod",
  copied: (kod: string) => `Kod ${kod} skopiowany, wklej go w nowym poście.`,
  copyFailed: (kod: string) => `Nie udało się skopiować, przepisz kod ${kod} w poście.`,
  verified: "✓ Konto zweryfikowane",
  verifiedWhy: "Twoje skoki dnia trafiają do tabel, a nick jest zarezerwowany.",
  testerPassword: "Hasło testerów (strona testowa)",
  testerSave: "Zapisz hasło testerów",
  testerNeeded: "Serwer testowy wymaga hasła testerów.",
  guestNote: "Bez konta skaczesz na losowym wietrze, a skoki nie trafiają do tabel.",
  used: (n: number, limit: number) => `Skoki: ${n} z ${limit}`,
  noJumpYet: "Jeszcze bez skoku.",
  bestJump: (j: { m: number; p: number; fell?: boolean }) =>
    `${meters(j.m)} m, ${pts(j.p)} pkt${j.fell === true ? ", upadek" : ""}`,
  hillSum: (p: number) => `Razem na skoczni: ${pts(p)} pkt`,
  jump: (n: number, limit: number) => `Skacz (skok ${n} z ${limit})`,
  allUsed: "Komplet skoków na tej skoczni.",
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
  tableCaption: (k: "w" | "m", key: string) => {
    const w = /^w(\d{4})-(\d{2})$/.exec(key);
    if (k === "w") return w ? `Tydzień ${Number(w[2])}.` : "Tydzień";
    const MONTHS = [
      "Styczeń",
      "Luty",
      "Marzec",
      "Kwiecień",
      "Maj",
      "Czerwiec",
      "Lipiec",
      "Sierpień",
      "Wrzesień",
      "Październik",
      "Listopad",
      "Grudzień",
    ];
    const m = /^m(\d{4})-(\d{2})$/.exec(key);
    return (m ? MONTHS[Number(m[2]) - 1] : undefined) ?? "Miesiąc";
  },
  tablePlace: "#",
  tablePlaceLong: "Miejsce",
  tableName: "Gracz",
  tablePoints: "Punkty",
  tableEmpty: "Jeszcze nikt nie skakał.",
  noJumps: "–",
  dayDone: "Wszystkie skoki na dziś wykorzystane. Nowe skocznie jutro.",
  tablesLabel: "Tabele",
  tabToday: "Dzisiaj",
  tableDays: "Dni",
  tableJumps: "Skoki",
  tableDay: "Dzień",
  jumpsOf: (n: number, all: number) => `${n}/${all}`,
  aboutFork: [
    {
      title: "Skocznie dnia",
      text: "Przeróbka Telemarka do skoczni dnia na stronie licznika d2jsp: kruszkush. Kod przeróbki, też na licencji GPL-3.0-or-later: github.com/kruszkush/telemark.",
    },
  ],
  watchTitle: (nick: string, day: string) => `Skok: ${nick}, ${day}`,
  watchError: "Nie udało się wczytać skoku.",
  watchBack: "Zamknij",
  points: pts,
  meters,
};
