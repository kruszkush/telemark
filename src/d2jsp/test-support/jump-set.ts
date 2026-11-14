import { OWN_HILLS, type HillChoice } from "../../game/hill-choice";
import { rivalLandingInput } from "../../game/rival-landing";
import { isJumpOver, startTrainingJump, stepTrainingJump, type TrainingJump } from "../../game/training-session";
import { BorlandRandom } from "../../sim/borland-random";
import { pilotView } from "../../sim/cpu-jump";
import { cpuPilotInput, drawCpuForm, drawCpuTalents, setupCpuPilot } from "../../sim/cpu-pilot";
import type { FrameInput } from "../../sim/jump-logic";
import { stepFrame } from "../../sim/jump-sim";
import { FRAME_DT_S } from "../../sim/physics-constants";
import { encodeInputs } from "../../storage/input-codec";
import { MAX_JUMP_FRAMES } from "../jump-check";

/**
 * Zestaw próbnych skoków do porównania fizyki gry z plikiem symulacji serwera (krok 1 docs/plan_d2jsp.md): na każdej
 * wbudowanej skoczni skoki automatu gry (pilot skoczków komputera) i te same skoki z zepsutymi ruchami (szarpanie
 * myszą, przesunięte albo brakujące przyciski), żeby były też upadki i dyskwalifikacje. Wynik liczony tu, w trakcie
 * skoku, w klatce lądowania i na końcu wyjazdu.
 */

export interface SetJump {
  hillId: string;
  seed: number;
  inputs: string;
  kind: "pilot" | "zepsuty";
  /** Wynik w klatce lądowania (tak liczy serwer). */
  atTouchdown: { distanceM: number; points: number; fell: boolean; frames: number } | null;
  /** Wynik po zatrzymaniu skoczka (tak gra zapisuje wynik po skoku). */
  atEnd: { distanceM: number; points: number; fell: boolean };
}

const NO_INPUT: FrameInput = { left: false, right: false, dy: 0 };

/** Skok automatu na skoczni w trybie treningu (ziarno jak w grze); ruchy zapisane klatka po klatce. */
function pilotInputs(hill: HillChoice, seed: number, level: number, noiseSeed: number): FrameInput[] {
  const rng = new BorlandRandom(noiseSeed);
  const record = { ...drawCpuTalents(level, rng), ...drawCpuForm(rng) };
  let pilot = setupCpuPilot(record, hill.kPointM, hill.profile, rng);
  const jump: TrainingJump = startTrainingJump(hill, seed);
  const inputs: FrameInput[] = [];
  while (!isJumpOver(jump) && inputs.length < MAX_JUMP_FRAMES) {
    jump.state = stepFrame(jump.state, jump.setup, (frame, at) => {
      const view = pilotView(frame, at);
      const out = cpuPilotInput(pilot, view, hill.profile, FRAME_DT_S, new BorlandRandom(at.randomSeed));
      pilot = out.pilot;
      const input = rivalLandingInput("improved", out.input, view, out.pilot, hill.profile);
      inputs.push(input);
      return input;
    });
  }
  return inputs;
}

/** Te same ruchy, zepsute ziarnem: szarpanie myszą, przyciski przesunięte albo zgubione. */
function spoil(inputs: readonly FrameInput[], noiseSeed: number): FrameInput[] {
  const rng = new BorlandRandom(noiseSeed);
  const shift = rng.below(41) - 20;
  const dropRight = rng.below(4) === 0;
  const jerk = rng.below(60);
  return inputs.map((_, i) => {
    const base = inputs[i + shift] ?? inputs[i] ?? NO_INPUT;
    const dy = Math.max(-128, Math.min(127, base.dy + (jerk > 0 ? rng.below(jerk * 2 + 1) - jerk : 0)));
    return { left: base.left, right: base.right && !dropRight, dy };
  });
}

/** Gra skok tymi ruchami (stepTrainingJump, jak jump-round.ts) i zapisuje wynik przy lądowaniu i na końcu. */
function played(hill: HillChoice, seed: number, inputs: readonly FrameInput[], kind: SetJump["kind"]): SetJump {
  let jump = startTrainingJump(hill, seed);
  let atTouchdown: SetJump["atTouchdown"] = null;
  let stepsToTouchdown = inputs.length;
  let step = 0;
  while (!isJumpOver(jump) && step < MAX_JUMP_FRAMES) {
    jump = stepTrainingJump(jump, inputs[step] ?? NO_INPUT);
    step++;
    const L = jump.state.logic;
    if (atTouchdown === null && L.finished) {
      atTouchdown = { distanceM: L.distanceM, points: L.points, fell: L.fallType !== 0, frames: L.frame };
      stepsToTouchdown = step;
    }
  }
  const L = jump.state.logic;
  // Gra wysyła ruchy do klatki lądowania: dalej wynik się nie zmienia.
  const used = inputs.slice(0, stepsToTouchdown);
  return {
    hillId: hill.id,
    seed,
    inputs: encodeInputs(used),
    kind,
    atTouchdown,
    atEnd: { distanceM: L.distanceM, points: L.points, fell: L.fallType !== 0 },
  };
}

/** `perHill` skoków automatu i tyle samo zepsutych na każdej z 23 skoczni. */
export function buildJumpSet(perHill: number): SetJump[] {
  const out: SetJump[] = [];
  OWN_HILLS.forEach((hill, h) => {
    for (let i = 0; i < perHill; i++) {
      const seed = (Math.imul(h + 1, 0x9e3779b1) ^ Math.imul(i + 7, 0x85ebca6b)) >>> 0;
      const inputs = pilotInputs(hill, seed, i % 5, seed ^ 0x5bd1e995);
      out.push(played(hill, seed, inputs, "pilot"));
      out.push(played(hill, seed, spoil(inputs, seed ^ 0x27d4eb2f), "zepsuty"));
    }
  });
  return out;
}
