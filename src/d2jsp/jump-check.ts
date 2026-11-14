import { OWN_HILLS, type HillChoice } from "../game/hill-choice";
import { isJumpOver, startTrainingJump, stepTrainingJump } from "../game/training-session";
import type { FrameInput } from "../sim/jump-logic";
import { decodeInputs } from "../storage/input-codec";

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

const NO_INPUT: FrameInput = { left: false, right: false, dy: 0 };

export const ownHill = (id: string): HillChoice | undefined => OWN_HILLS.find((hill) => hill.id === id);

/** Skok z gotowych ruchów; null, gdy nie skończył się w MAX_JUMP_FRAMES. */
export function scoreInputs(hill: HillChoice, seed: number, inputs: readonly FrameInput[]): CheckedJump | null {
  let jump = startTrainingJump(hill, seed >>> 0);
  let step = 0;
  while (!jump.state.logic.finished && !isJumpOver(jump) && step < MAX_JUMP_FRAMES) {
    jump = stepTrainingJump(jump, inputs[step] ?? NO_INPUT);
    step++;
  }
  const L = jump.state.logic;
  if (!L.finished) return null;
  return { distanceM: L.distanceM, points: L.points, fell: L.fallType !== 0, frames: L.frame };
}

/** Skok z ruchów zapisanych tekstem gry (input-codec.ts) na skoczni o tym id. */
export function checkJump(hillId: string, seed: number, inputsText: string): CheckedJump | { error: string } {
  const hill = ownHill(hillId);
  if (!hill) return { error: "nieznana skocznia" };
  const inputs = decodeInputs(inputsText);
  if (!inputs) return { error: "złe ruchy" };
  if (inputs.length > MAX_JUMP_FRAMES) return { error: "za długi skok" };
  return scoreInputs(hill, seed, inputs) ?? { error: "skok się nie skończył" };
}
