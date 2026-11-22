/**
 * Skocznie dnia na stronie licznika d2jsp (docs/zasady_d2jsp.md): dzień w czasie polskim, trzy grupy wbudowanych
 * skoczni i losowanie trzech skoczni dnia z samej daty. Ten sam kod liczy je w grze (gość) i na serwerze
 * (lotnik/serwer/telemark.js przez plik zbudowany z src/d2jsp/server-entry.ts).
 */

/** Grupy skoczni: mała K50–K95, średnia K100–K170, mamucia K185–K300 (id ze src/hills/own-hills*.ts). */
export const HILL_GROUPS: readonly { name: string; ids: readonly string[] }[] = [
  { name: "mała", ids: ["own-14", "own-15", "own-16", "own-17", "own-18", "own-3", "own-19"] },
  { name: "średnia", ids: ["own-20", "own-21", "own-22", "own-23", "own-24", "own-25", "own-26", "own-27"] },
  { name: "mamucia", ids: ["own-28", "own-29", "own-30", "own-31", "own-32", "own-33", "own-34", "own-35"] },
];

/**
 * Skocznia treningowa zalogowanego: losowa ze wszystkich grup przy każdym wejściu na ekran dnia, czyli po każdym skoku
 * treningowym inna niż poprzednia (Mateusz 22.11, zastąpiło stałą Jodłową K135 z 14.11); nigdy dzisiejsza skocznia
 * dnia (próba na skoczniach dnia odrzucona 14.11); bez limitu i bez zapisu, losowy wiatr jak skok na próbę gościa.
 */
export function randomTrainingHillId(
  previous: string | null,
  today: readonly string[],
  random: () => number = Math.random,
): string {
  const ids = HILL_GROUPS.flatMap((g) => g.ids).filter((id) => id !== previous && !today.includes(id));
  return ids[Math.floor(random() * ids.length)] ?? ids[0] ?? "";
}

const WARSAW = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Warsaw",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Dzień chwili `ms` w czasie polskim, np. "2026-11-14". */
export function dayOf(ms: number): string {
  return WARSAW.format(new Date(ms));
}

/** 32-bitowy skrót FNV-1a tekstu (te same bity w każdej przeglądarce i w Node). */
export function hash32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Trzy skocznie dnia (mała, średnia, mamucia) dla dnia "RRRR-MM-DD". */
export function dailyHillIds(day: string): [string, string, string] {
  const pick = (group: number): string => {
    const ids = HILL_GROUPS[group]?.ids ?? [];
    return ids[hash32(`tm-hills|1|${day}|${group}`) % ids.length] ?? "";
  };
  return [pick(0), pick(1), pick(2)];
}
