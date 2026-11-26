/**
 * Punkty za wiatr w skokach dnia (docs/zasady_d2jsp.md „Punkty i tabele”, plan docs/plan_wiatr_punkty.md): średni
 * wiatr wzdłuż skoczni z lotu razy metry, które 1 m/s tego wiatru zabiera albo dodaje na tej skoczni, razy punkty za
 * metr. Za wiatr w plecy gra dodaje, za wiatr pod narty odejmuje; bez premii (Mateusz 25.11). Jedyne miejsce, gdzie
 * liczy się punkty za wiatr i sumę z nimi: ten sam kod w grze i na serwerze (plik symulacji).
 */
import { HILL_GROUPS } from "./daily";

/** Metry na 1 m/s średniego wiatru z lotu: pod narty (wiatr < 0, skok dłuższy) i w plecy (wiatr > 0, krótszy). */
interface WindMetres {
  head: number;
  tail: number;
}

/** Przeliczniki obowiązujące od dnia `od` (czas polski) do następnego okresu; przed pierwszym wiatr nie daje punktów. */
interface WindPeriod {
  od: string;
  metres: Readonly<Record<string, WindMetres>>;
}

/**
 * Pomiar 25.11 (src/d2jsp/wind-measure.test.ts, WIATR_POMIAR=1): komputerowy skoczek poziomu 2 i 4, 40 skoczków przy
 * stałym wietrze −4…+4 m/s; każda liczba to średnia obu poziomów z prostej dla swojej strony wiatru.
 */
const MEASURED_2511: Readonly<Record<string, WindMetres>> = {
  "own-14": { head: 0.43, tail: 0.85 },
  "own-15": { head: 1.25, tail: 1.03 },
  "own-16": { head: 1.17, tail: 1.09 },
  "own-17": { head: 0.96, tail: 1.23 },
  "own-18": { head: 1.48, tail: 1.19 },
  "own-3": { head: 1.64, tail: 1.52 },
  "own-19": { head: 1.88, tail: 1.74 },
  "own-20": { head: 2.18, tail: 2.08 },
  "own-21": { head: 1.72, tail: 1.97 },
  "own-22": { head: 2.92, tail: 2.66 },
  "own-23": { head: 2.49, tail: 2.33 },
  "own-24": { head: 2.43, tail: 2.59 },
  "own-25": { head: 2.74, tail: 3.41 },
  "own-26": { head: 2.95, tail: 3.47 },
  "own-27": { head: 2.98, tail: 4.15 },
  "own-28": { head: 3.77, tail: 3.38 },
  "own-29": { head: 4.37, tail: 4.01 },
  "own-30": { head: 3.62, tail: 4.87 },
  "own-31": { head: 4.3, tail: 3.99 },
  "own-32": { head: 4.08, tail: 5.54 },
  "own-33": { head: 4.06, tail: 6.2 },
  "own-34": { head: 4.04, tail: 5.22 },
  "own-35": { head: 4.59, tail: 6.4 },
};

/**
 * Prawdziwi gracze (skoki dnia z prod 21–25.11, 876 skoków, docs/plan_wiatr_punkty.md „Rozliczenie” 26.11) tracą i
 * zyskują od wiatru więcej metrów niż komputer: mała 1,15 raza, średnia 1,45, mamucia 1,7. Jedna liczba na grupę, bo na
 * pojedynczą skocznię skoków za mało (Mateusz 26.11: „żeby było poprawnie od jutra”).
 */
const PLAYERS_2611: readonly number[] = [1.15, 1.45, 1.7];

const scaledByGroup = (m: Readonly<Record<string, WindMetres>>, factors: readonly number[]): Record<string, WindMetres> =>
  Object.fromEntries(
    HILL_GROUPS.flatMap((g, i) =>
      g.ids.map((id) => {
        const f = factors[i] ?? 1;
        const x = m[id] ?? { head: 0, tail: 0 };
        return [id, { head: Math.round(x.head * f * 100) / 100, tail: Math.round(x.tail * f * 100) / 100 }];
      }),
    ),
  );

/** Start: skoki dnia od 26.11.2026 (Mateusz 25.11: „gdy jest nowy dzień, gdy są nowe skocznie”); od 27.11 wg graczy. */
export const WIND_PERIODS: readonly WindPeriod[] = [
  { od: "2026-11-26", metres: MEASURED_2511 },
  { od: "2026-11-27", metres: scaledByGroup(MEASURED_2511, PLAYERS_2611) },
];

/** Punkty za metr jak w punktach gry (src/sim/jump-logic.ts distancePoints). */
export function pointsPerMetre(kPointM: number): number {
  if (kPointM <= 90) return 2;
  if (kPointM < 145) return 1.8;
  return 1.2;
}

/** Czy w dniu `day` wiatr daje punkty (od pierwszego okresu); wcześniej gra nie pokazuje punktów za wiatr. */
export const windCounts = (day: string): boolean => WIND_PERIODS.some((p) => p.od <= day);

function metresOn(day: string, hillId: string): WindMetres | null {
  let found: WindPeriod | null = null;
  for (const p of WIND_PERIODS) if (p.od <= day) found = p;
  return found?.metres[hillId] ?? null;
}

/** Wynik skoku z wiatrem: średni wiatr z lotu (m/s, + w plecy), punkty za wiatr i suma (dziesiąte części, ≥ 0). */
export interface WindScore {
  windMPerS: number;
  windPoints: number;
  pointsWithWind: number;
}

/**
 * Skok dnia `day` na skoczni `hillId` (punkt K `kPointM`) z punktami gry `points` i średnim wiatrem z lotu. Przed
 * pierwszym okresem albo na skoczni bez przelicznika punkty za wiatr to 0.
 */
export function windScore(day: string, hillId: string, kPointM: number, points: number, windMPerS: number): WindScore {
  const m = metresOn(day, hillId);
  const metres = m === null ? 0 : windMPerS > 0 ? m.tail : m.head;
  const windTenths = Math.round(windMPerS * metres * pointsPerMetre(kPointM) * 10);
  const totalTenths = Math.max(0, Math.round(points * 10) + windTenths);
  return { windMPerS, windPoints: windTenths / 10, pointsWithWind: totalTenths / 10 };
}

/** Sumuje wiatr wzdłuż skoczni w klatkach lotu: od wybicia (afterTakeoff) do przygotowania do lądowania. */
export interface FlightWind {
  sum: number;
  frames: number;
}

export const NO_FLIGHT_WIND: FlightWind = { sum: 0, frames: 0 };

/** Średni wiatr z lotu; bez klatek lotu 0. */
export const meanFlightWind = (w: FlightWind): number => (w.frames === 0 ? 0 : w.sum / w.frames);
