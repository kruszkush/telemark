import { OWN_HILLS, type HillChoice } from "../game/hill-choice";
import { isJumpOver, startTrainingJump, stepTrainingJump } from "../game/training-session";
import { PHASE, type FrameInput } from "../sim/jump-logic";
import { decodeInputs } from "../storage/input-codec";
import { meanFlightWind, NO_FLIGHT_WIND, windScore, type FlightWind, type WindScore } from "./wind-points";

/**
 * Wynik skoku liczony bez rysowania z ziarna i ruchów gracza, tą samą drogą co skok w grze (jump-runs.ts:
 * startTrainingJump i stepTrainingJump, ruch i-ty w i-tym kroku). Wynik jest z klatki lądowania, w której gra go
 * ustala (jump-round.ts: touchdown); serwer sprawdza nim skok wysłany z gry.
 */

/**
 * Dłużej żaden skok nie trwa (skok jest skończony przed 6000 klatkami). Czekanie na belce w skoku dnia nie jest
 * zapisywane (jump-round.ts: holdAtGate), więc ruchy zaczynają się od chwili, w której wolno ruszyć.
 */
export const MAX_JUMP_FRAMES = 6000;
/** Klatek symulacji na sekundę (training-session.ts FRAME_S). */
export const FRAMES_PER_S = 70;

export interface CheckedJump {
  distanceM: number;
  /** Punkty skoku, jak liczy gra (dziesiąte części). */
  points: number;
  fell: boolean;
  /** Klatka, w której wynik był gotowy. */
  frames: number;
}

/** Skok z punktami za wiatr dnia (wind-points.ts); te punkty idą do tabel. */
export type CheckedDailyJump = CheckedJump & WindScore;

const NO_INPUT: FrameInput = { left: false, right: false, dy: 0 };

export const ownHill = (id: string): HillChoice | undefined => OWN_HILLS.find((hill) => hill.id === id);

/** Skok z gotowych ruchów i wiatr z jego lotu; null, gdy nie skończył się w MAX_JUMP_FRAMES. */
function runInputs(
  hill: HillChoice,
  seed: number,
  inputs: readonly FrameInput[],
): { jump: CheckedJump; wind: FlightWind } | null {
  let jump = startTrainingJump(hill, seed >>> 0);
  let step = 0;
  let wind = NO_FLIGHT_WIND;
  while (!jump.state.logic.finished && !isJumpOver(jump) && step < MAX_JUMP_FRAMES) {
    jump = stepTrainingJump(jump, inputs[step] ?? NO_INPUT);
    step++;
    const phase = jump.state.logic.phase;
    if (phase >= PHASE.afterTakeoff && phase <= PHASE.landingPrep) {
      wind = { sum: wind.sum + jump.state.wind.xMPerS, frames: wind.frames + 1 };
    }
  }
  const L = jump.state.logic;
  if (!L.finished) return null;
  return { jump: { distanceM: L.distanceM, points: L.points, fell: L.fallType !== 0, frames: L.frame }, wind };
}

/** Skok z gotowych ruchów; null, gdy nie skończył się w MAX_JUMP_FRAMES. */
export function scoreInputs(hill: HillChoice, seed: number, inputs: readonly FrameInput[]): CheckedJump | null {
  return runInputs(hill, seed, inputs)?.jump ?? null;
}

/** Skok dnia `day` (dzień z biletu, nie z zegara) z gotowych ruchów, z punktami za wiatr. */
export function scoreDailyInputs(
  hill: HillChoice,
  seed: number,
  inputs: readonly FrameInput[],
  day: string,
): CheckedDailyJump | null {
  const r = runInputs(hill, seed, inputs);
  if (!r) return null;
  return { ...r.jump, ...windScore(day, hill.id, hill.kPointM, r.jump.points, meanFlightWind(r.wind)) };
}

/**
 * Skok z ruchów zapisanych tekstem gry (input-codec.ts) na skoczni o tym id, dnia `day` z biletu; bez dnia (starszy
 * serwer) punkty za wiatr to 0.
 */
export function checkJump(
  hillId: string,
  seed: number,
  inputsText: string,
  day = "",
): CheckedDailyJump | { error: string } {
  const hill = ownHill(hillId);
  if (!hill) return { error: "nieznana skocznia" };
  const inputs = decodeInputs(inputsText);
  if (!inputs) return { error: "złe ruchy" };
  if (inputs.length > MAX_JUMP_FRAMES) return { error: "za długi skok" };
  return scoreDailyInputs(hill, seed, inputs, day) ?? { error: "skok się nie skończył" };
}
