import { fontDraws } from "../render/pixel-font";

/** Tyle znaków mieści pasek nazwiska skoczka (jak nazwa z pliku powtórki oryginału, jump-replay.ts). */
const MAX_CHARS = 25;

/** Nick konta jako nazwisko skoczka w obrazie: wielkie litery, znak spoza czcionki gry zamieniony na kreskę. */
export function jumperNick(nick: string): string {
  // Znak po znaku kodu: emotka złożona z kilku też staje się kreskami, co tu wystarcza.
  // oxlint-disable-next-line typescript/no-misused-spread
  const chars = [...nick.trim().toUpperCase()].map((ch) => (ch === " " || fontDraws(ch) ? ch : "-"));
  return chars.slice(0, MAX_CHARS).join("");
}
