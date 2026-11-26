import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HILL_GROUPS } from "./daily";
import { checkJump } from "./jump-check";
import type { SetJump } from "./test-support/jump-set";
import { WIND_PERIODS, windScore } from "./wind-points";

describe("punkty za wiatr (skoki dnia od 26.11.2026)", () => {
  it("każda skocznia dnia ma przelicznik w każdym okresie", () => {
    for (const p of WIND_PERIODS) {
      for (const id of HILL_GROUPS.flatMap((g) => g.ids)) expect({ od: p.od, id, ok: id in p.metres }).toEqual({ od: p.od, id, ok: true });
    }
  });

  it("przed 26.11 wiatr nie daje punktów", () => {
    expect(windScore("2026-11-25", "own-35", 300, 120, 2)).toEqual({ windMPerS: 2, windPoints: 0, pointsWithWind: 120 });
  });

  it("wiatr w plecy dodaje, pod narty odejmuje, każdy swoim przelicznikiem", () => {
    // Olbrzym K300: w plecy 6,4 m na 1 m/s, pod narty 4,59; 1,2 pkt za metr.
    expect(windScore("2026-11-26", "own-35", 300, 120, 2).windPoints).toBe(15.4);
    expect(windScore("2026-11-26", "own-35", 300, 120, -2).windPoints).toBe(-11);
    expect(windScore("2026-11-26", "own-35", 300, 120, -2).pointsWithWind).toBe(109);
    // Zajęcza K50: 2 pkt za metr.
    expect(windScore("2026-11-26", "own-14", 50, 60, 1).windPoints).toBe(1.7);
    expect(windScore("2026-11-26", "own-14", 50, 60, 0).windPoints).toBe(0);
  });

  it("od 27.11 przeliczniki wg prawdziwych graczy: mała 1,15 raza, mamucia 1,7 raza więcej; 26.11 bez zmian", () => {
    // Zajęcza K50: w plecy 0,85 × 1,15 = 0,98 m na 1 m/s, 2 pkt za metr.
    expect(windScore("2026-11-27", "own-14", 50, 60, 1).windPoints).toBe(2);
    // Olbrzym K300: w plecy 6,4 × 1,7 = 10,88 m, pod narty 4,59 × 1,7 = 7,8 m; 1,2 pkt za metr.
    expect(windScore("2026-11-27", "own-35", 300, 120, 2).windPoints).toBe(26.1);
    expect(windScore("2026-11-27", "own-35", 300, 120, -2).windPoints).toBe(-18.7);
    expect(windScore("2026-11-26", "own-35", 300, 120, 2).windPoints).toBe(15.4);
  });

  it("suma nie spada poniżej zera (upadek z wiatrem pod narty)", () => {
    expect(windScore("2026-11-26", "own-35", 300, 3, -3).pointsWithWind).toBe(0);
  });

  it("punkty za wiatr zestawu skoków w pliku są tymi, które daje gra (porównanie Node 22 i przeglądarek)", () => {
    const file = new URL("./test-support/jump-set-wind.json", import.meta.url);
    const set = JSON.parse(readFileSync(new URL("./test-support/jump-set.json", import.meta.url), "utf8")) as SetJump[];
    const wind = set.map((j) => {
      const r = checkJump(j.hillId, j.seed, j.inputs, "2099-01-01");
      return "error" in r ? null : { windMPerS: r.windMPerS, windPoints: r.windPoints, pointsWithWind: r.pointsWithWind };
    });
    if (process.env["D2JSP_WRITE_SET"] === "1") writeFileSync(file, JSON.stringify(wind, null, 1) + "\n");
    expect(JSON.parse(readFileSync(file, "utf8"))).toEqual(wind);
  });

  it("skok z zestawu: punkty gry bez zmian, wiatr tylko od dnia z biletu", () => {
    const set = JSON.parse(readFileSync(new URL("./test-support/jump-set.json", import.meta.url), "utf8")) as SetJump[];
    const j = set.find((s) => s.atTouchdown !== null && s.atTouchdown.points > 80 && s.hillId === "own-35");
    if (!j) throw new Error("brak skoku");
    const before = checkJump(j.hillId, j.seed, j.inputs, "2026-11-25");
    const after = checkJump(j.hillId, j.seed, j.inputs, "2026-11-26");
    if ("error" in before || "error" in after) throw new Error("skok odrzucony");
    expect(before.points).toBe(j.atTouchdown?.points);
    expect(before.pointsWithWind).toBe(Math.max(0, Math.round(before.points * 10) / 10));
    expect(after.windMPerS).not.toBe(0);
    expect(after.pointsWithWind).toBeCloseTo(Math.round(after.points * 10) / 10 + after.windPoints, 5);
  });
});
