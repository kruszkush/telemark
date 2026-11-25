import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dailyHillIds, dayOf, HILL_GROUPS } from "./daily";
import { checkJump } from "./jump-check";
import { buildJumpSet, type SetJump } from "./test-support/jump-set";
import { OWN_HILLS } from "../game/hill-choice";

/**
 * Zestaw próbnych skoków (krok 1 docs/plan_d2jsp.md) jest zapisany w pliku: ten sam plik czyta porównanie pliku
 * symulacji serwera w Node 22 (scripts/d2jsp-sim-node.mjs) i w przeglądarkach (e2e/d2jsp-sim.spec.ts).
 * Nowy plik: D2JSP_WRITE_SET=1 pnpm vitest run src/d2jsp/jump-check.test.ts
 */
const SET_FILE = new URL("./test-support/jump-set.json", import.meta.url);
const PER_HILL = 4;
const kOf = (id: string): number => OWN_HILLS.find((h) => h.id === id)?.kPointM ?? -1;

describe("skok liczony bez rysowania (serwer d2jsp)", () => {
  const set: SetJump[] = buildJumpSet(PER_HILL);
  if (process.env["D2JSP_WRITE_SET"] === "1") writeFileSync(SET_FILE, JSON.stringify(set, null, 1) + "\n");

  it("zestaw w pliku jest tym, który daje gra", () => {
    expect(JSON.parse(readFileSync(SET_FILE, "utf8"))).toEqual(set);
  });

  it("zestaw ma upadki i dyskwalifikacje, nie tylko udane skoki", () => {
    expect(set.length).toBe(OWN_HILLS.length * PER_HILL * 2);
    const done = set.flatMap((j) => (j.atTouchdown === null ? [] : [j.atTouchdown]));
    expect(done.filter((t) => t.fell).length).toBeGreaterThan(5);
    expect(done.filter((t) => t.distanceM === 0).length).toBeGreaterThan(0);
    expect(done.filter((t) => !t.fell && t.distanceM > 0).length).toBeGreaterThan(50);
  });

  it("wynik w klatce lądowania jest wynikiem po zatrzymaniu skoczka", () => {
    for (const j of set) {
      const { frames: _frames, ...touchdown } = j.atTouchdown ?? { frames: 0 };
      expect({ jump: `${j.hillId} ${j.seed}`, ...touchdown }).toEqual({ jump: `${j.hillId} ${j.seed}`, ...j.atEnd });
    }
  });

  it("checkJump z samych ruchów (tekst gry) daje wynik z lądowania", () => {
    // Punkty za wiatr (wind-points.test.ts) są obok: wynik gry zostaje ten sam.
    const game = (r: ReturnType<typeof checkJump>) => {
      if ("error" in r) return r;
      const { windMPerS: _w, windPoints: _p, pointsWithWind: _t, ...jump } = r;
      return jump;
    };
    expect(set.map((j) => game(checkJump(j.hillId, j.seed, j.inputs)))).toEqual(set.map((j) => j.atTouchdown));
  });

  it("odrzuca złe dane", () => {
    expect(checkJump("own-99", 1, "2:AAAA")).toEqual({ error: "nieznana skocznia" });
    expect(checkJump("own-3", 1, "nie ruchy")).toEqual({ error: "złe ruchy" });
  });
});

describe("skocznie dnia", () => {
  it("dzień w czasie polskim", () => {
    expect(dayOf(Date.UTC(2026, 10, 14, 22, 59))).toBe("2026-11-14");
    expect(dayOf(Date.UTC(2026, 10, 14, 23, 0))).toBe("2026-11-15");
    expect(dayOf(Date.UTC(2026, 6, 1, 21, 59))).toBe("2026-07-01");
    expect(dayOf(Date.UTC(2026, 6, 1, 22, 0))).toBe("2026-07-02");
  });

  it("grupy mają 7, 8 i 8 skoczni o właściwych punktach K", () => {
    expect(HILL_GROUPS.map((g) => g.ids.length)).toEqual([7, 8, 8]);
    const ranges = HILL_GROUPS.map((g) => g.ids.map(kOf)).map((ks) => [Math.min(...ks), Math.max(...ks)]);
    expect(ranges).toEqual([
      [50, 95],
      [100, 170],
      [185, 300],
    ]);
  });

  it("każdego dnia jedna skocznia z każdej grupy, w ciągu roku wszystkie się trafiają", () => {
    const seen = new Set<string>();
    for (let d = 0; d < 365; d++) {
      const day = dayOf(Date.UTC(2026, 0, 1, 12) + d * 86_400_000);
      const ids = dailyHillIds(day);
      ids.forEach((id, g) => expect(HILL_GROUPS[g]?.ids).toContain(id));
      ids.forEach((id) => seen.add(id));
    }
    expect(seen.size).toBe(23);
  });
});
