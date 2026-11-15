/** Teksty trybu „Skocznie dnia” na stronie licznika d2jsp (ustalenia: docs/zasady_d2jsp.md). */

const pts = (p: number) => p.toFixed(1).replace(".", ",");
const meters = (m: number) => m.toFixed(1).replace(".", ",");
/**
 * Tydzień ISO "wRRRR-TT" jak na stronie licznika (d2jsp/strona.js weekName): „Listopad · tydzień 3”, miesiąc czwartku,
 * tydzień 1 = ten z 1. dniem miesiąca.
 */
function weekName(key: string, months: readonly string[]): string {
  const DAY = 864e5;
  const mondayOf = (t: number) => t - ((new Date(t).getUTCDay() + 6) % 7) * DAY;
  const year = Number(key.slice(1, 5)),
    week = Number(key.slice(6));
  const mon = mondayOf(Date.UTC(year, 0, 4)) + 7 * (week - 1) * DAY;
  const thu = new Date(mon + 3 * DAY);
  const first = mondayOf(Date.UTC(thu.getUTCFullYear(), thu.getUTCMonth(), 1));
  return `${months[thu.getUTCMonth()] ?? ""} · tydzień ${Math.round((mon - first) / (7 * DAY)) + 1}`;
}

export const D2_TEXT = {
  title: "Skocznie dnia",
  rules:
    "Codziennie o północy losowane są 3 nowe skocznie: mała, średnia i mamucia. Na każdej możesz oddać 10 skoków. Do punktacji liczą się 2 najlepsze skoki z każdej skoczni, a wynik dnia to suma tych sześciu skoków. Gra sama wybiera skocznię: 2 skoki na małej, 2 na średniej, 2 na mamuciej i od nowa, więc pełny wynik dnia masz już po 6 skokach. Każdy z 10 skoków ma inny wiatr, ale te same wiatry dostają wszyscy gracze.",
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
  // Kod od admina jak w Lotniku (lotnik/konto.js: showForm z withCode).
  haveCode: "Mam kod od admina",
  codeBack: "Wróć",
  codeHint: "Kod od admina: wpisz nick, kod i nowe hasło. Hasło zmieni się też w Lotniku.",
  code: "Kod od admina",
  newPassword: "Nowe hasło (min. 6 znaków)",
  setPassword: "Ustaw hasło",
  settingPassword: "Ustawianie hasła…",
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
  // Ekran dnia wg makiety proto/uklad-dnia (Mateusz 14.11): nazwa gry z datą, karty skoczni z rekordami.
  gameTitle: "Telemark",
  dateLine: (day: string) => {
    const DAYS = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
    const [y, m, d] = day.split("-").map(Number);
    const dow = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, d ?? 1)).getUTCDay();
    return `${DAYS[dow] ?? ""} ${d ?? ""}.${String(m ?? "").padStart(2, "0")}`;
  },
  recordDay: "Rekord dnia",
  recordHill: "Rekord skoczni",
  recordNone: "jeszcze nikt",
  shortDate: (day: string) => `${Number(day.slice(8, 10))}.${day.slice(5, 7)}`,
  yourBest: "Twoje 2 najlepsze skoki",
  fell: "upadek",
  hillSumLabel: "Razem (2 najlepsze)",
  metersUnit: (m: number) => `${meters(m)} m`,
  pointsUnit: (p: number) => `${pts(p)} pkt`,
  jump: (n: number, limit: number) => `Skacz (skok ${n} z ${limit})`,
  allUsed: "Komplet skoków na tej skoczni.",
  trial: "Skacz na próbę",
  dayTotal: (p: number) => `Wynik dnia: ${pts(p)} pkt`,
  starting: "Wychodzisz na belkę…",
  usedNote:
    "Skok liczy się od wyjścia na belkę: wyjście z gry albo zamknięcie strony w trakcie go zużywa. Na skoczni treningowej możesz skakać do woli, żeby nauczyć się gry; te skoki nie trafiają do tabel.",
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
  trainingTitle: "Trening",
  trainingNote: "bez limitu i bez zapisu",
  training: "Skacz na treningu",
  trainingShort: "Skacz",
  trainingResult: (m: number, p: number) => `Skok treningowy: ${meters(m)} m, ${pts(p)} pkt (bez zapisu).`,
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
  // Ekran „Skoki gracza” (player-screen.tsx, Mateusz 14.11: sprawdzić oszusta na wielu skokach).
  playerTitle: "Skoki gracza",
  playerLoading: "Wczytywanie skoków…",
  playerError: "Nie udało się wczytać skoków gracza.",
  playerPeriod: (key: string, sum: number, n: number) => {
    const MONTHS = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
    const name = key.startsWith("y")
      ? `Rok ${key.slice(1)}`
      : key.startsWith("m")
        ? `${MONTHS[Number(key.slice(6, 8)) - 1] ?? ""} ${key.slice(1, 5)}`
        : weekName(key, MONTHS);
    return `${name}: ${pts(sum)} pkt (liczy się ${n} najlepszych dni).`;
  },
  playerDays: "Dni",
  playerNoDays: "W tym okresie bez skoków.",
  playerDay: (day: string) => `${Number(day.slice(8, 10))}.${day.slice(5, 7)}`,
  playerDayTitle: (day: string, p: number) => `${Number(day.slice(8, 10))}.${day.slice(5, 7)}.${day.slice(0, 4)}: wynik dnia ${pts(p)} pkt`,
  playerCountedDay: "liczony do okresu",
  playerCounted: "liczony",
  playerUnfinished: "nie dokończony (bez wyniku)",
  playerNoHillJumps: "Bez skoków.",
  playerToday: "Dzisiejsze skoki można obejrzeć od jutra (dziś każdy ma ten sam wiatr).",
  playerWatch: (n: number) => `Obejrzyj skok ${n}.`,
  playIcon: "▶",
  playerJump: (n: number, m: number, p: number, fell: boolean) =>
    `${n}. ${meters(m)} m, ${pts(p)} pkt${fell ? ", upadek" : ""}`,
  back: "Wróć",
  backToPlayer: "Wróć do skoków gracza",
  watchBack: "Zamknij",
  points: pts,
  meters,
};
