/**
 * Pomiar (nie zwykły test): o ile metrów wiatr wzdłuż skoczni zmienia skok komputerowego skoczka na każdej skoczni
 * dnia. Z tego biorą się punkty za wiatr (docs/plan_wiatr_punkty.md). Uruchomienie:
 * WIATR_POMIAR=1 vitest run src/d2jsp/wind-measure.test.ts
 */
import { describe, expect, it } from "vitest";
import { cpuJumpStart } from "../game/competition-jump";
import { OWN_HILLS, type HillChoice } from "../game/hill-choice";
import { startComputedJump } from "../game/training-session";
import { BorlandRandom } from "../sim/borland-random";
import { pilotView } from "../sim/cpu-jump";
import { cpuPilotInput, type CpuJumperRecord } from "../sim/cpu-pilot";
import { PHASE } from "../sim/jump-logic";
import { jumpRunning, stepFrame } from "../sim/jump-sim";
import { FRAME_DT_S } from "../sim/physics-constants";
import type { WindState } from "../sim/wind";
import { HILL_GROUPS } from "./daily";

interface Run {
  distanceM: number;
  fell: boolean;
  /** Średni wiatr wzdłuż skoczni w locie (od wybicia do lądowania) i od startu z belki do lądowania. */
  flightWind: number;
  wholeWind: number;
}

function cpuRun(hill: HillChoice, record: CpuJumperRecord, seed: number, wind?: (w: WindState) => WindState): Run {
  const { start, pilot: firstPilot } = cpuJumpStart(hill, record, seed);
  const jump = startComputedJump(hill, wind ? { ...start, wind: wind(start.wind) } : start);
  let sim = jump.state;
  let pilot = firstPilot;
  let flight = 0;
  let flightN = 0;
  let whole = 0;
  let wholeN = 0;
  while (jumpRunning(sim) && !sim.logic.finished && sim.logic.frame < 6000) {
    sim = stepFrame(sim, jump.setup, (frame, at) => {
      const out = cpuPilotInput(pilot, pilotView(frame, at), hill.profile, FRAME_DT_S, new BorlandRandom(at.randomSeed));
      pilot = out.pilot;
      return out.input;
    });
    const phase = sim.logic.phase;
    if (phase >= PHASE.inrun && phase <= PHASE.landingPrep) {
      whole += sim.wind.xMPerS;
      wholeN++;
    }
    if (phase >= PHASE.afterTakeoff && phase <= PHASE.landingPrep) {
      flight += sim.wind.xMPerS;
      flightN++;
    }
  }
  return {
    distanceM: sim.logic.distanceM,
    fell: sim.logic.fallType !== 0,
    flightWind: flightN ? flight / flightN : 0,
    wholeWind: wholeN ? whole / wholeN : 0,
  };
}

/** Nachylenie prostej y = a + b x (najmniejsze kwadraty) i jak dobrze pasuje (R²). */
function fit(xs: number[], ys: number[]): { slope: number; r2: number } {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = (xs[i] ?? 0) - mx;
    const dy = (ys[i] ?? 0) - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  return { slope: sxy / sxx, r2: (sxy * sxy) / (sxx * syy) };
}

const steady = (x: number) => (w: WindState): WindState => ({
  ...w,
  xMPerS: x,
  yMPerS: 0,
  variabilityMPerS: 0,
  speedMPerS: Math.abs(x),
  directionRad: x >= 0 ? 0 : Math.PI,
});

const WINDS = [-4, -3, -2, -1, 0, 1, 2, 3, 4];

describe.skipIf(process.env["WIATR_POMIAR"] !== "1")("pomiar wiatru", () => {
  it("metry na 1 m/s na każdej skoczni dnia", () => {
    const lines: string[] = [];
    for (const group of HILL_GROUPS) {
      for (const id of group.ids) {
        const hill = OWN_HILLS.find((h) => h.id === id);
        if (!hill) throw new Error(id);
        const parts: string[] = [];
        for (const level of [2, 4]) {
          const record: CpuJumperRecord = { form1: 0, form2: 0, talent1: 0, talent2: 0, level };
          // Stały wiatr: ten sam skoczek (ziarno) przy 7 siłach wiatru, odległość względem jego średniej.
          const xs: number[] = [];
          const ys: number[] = [];
          let falls = 0;
          for (let seed = 1; seed <= 40; seed++) {
            const runs = WINDS.map((x) => cpuRun(hill, record, seed * 7919, steady(x)));
            if (runs.some((r) => r.fell)) {
              falls++;
              continue;
            }
            const mean = runs.reduce((a, r) => a + r.distanceM, 0) / runs.length;
            runs.forEach((r, i) => {
              xs.push(WINDS[i] ?? 0);
              ys.push(r.distanceM - mean);
            });
          }
          const s = fit(xs, ys);
          // Osobno wiatr pod narty (x ≤ 0) i w plecy (x ≥ 0): czy jedna prosta pasuje do obu.
          const head = fit(xs.filter((x) => x <= 0), ys.filter((_, i) => (xs[i] ?? 0) <= 0));
          const tail = fit(xs.filter((x) => x >= 0), ys.filter((_, i) => (xs[i] ?? 0) >= 0));
          // Zwykły, zmienny wiatr: czy odległość lepiej tłumaczy średnia z lotu, czy od belki.
          const fx: number[] = [];
          const wx: number[] = [];
          const d: number[] = [];
          for (let seed = 1; seed <= 150; seed++) {
            const r = cpuRun(hill, record, seed * 104729);
            if (r.fell) continue;
            fx.push(r.flightWind);
            wx.push(r.wholeWind);
            d.push(r.distanceM);
          }
          const f = fit(fx, d);
          const w = fit(wx, d);
          parts.push(
            `p${level}: ${s.slope.toFixed(2)} m/(m/s) R2 ${s.r2.toFixed(2)} [pod narty ${head.slope.toFixed(2)}, w plecy ${tail.slope.toFixed(2)}] upadki ${falls}/40 | zmienny: lot ${f.slope.toFixed(2)} R2 ${f.r2.toFixed(2)}, cały ${w.slope.toFixed(2)} R2 ${w.r2.toFixed(2)}`,
          );
        }
        lines.push(`${group.name} ${id} ${hill.name} K${hill.kPointM}: ${parts.join(" || ")}`);
      }
    }
    console.log(lines.join("\n"));
    expect(lines.length).toBe(23);
  }, 1_200_000);
});
