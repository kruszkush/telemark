import { describe, expect, it } from "vitest";
import { nextHill } from "./next-hill";

/** Kolejne skocznie od pustego dnia, skok po skoku. */
function order(start: number[], jumps: number, limit = 10): (number | null)[] {
  const used = [...start];
  const out: (number | null)[] = [];
  for (let i = 0; i < jumps; i++) {
    const g = nextHill(used, 3, limit);
    out.push(g);
    if (g !== null) used[g] = (used[g] ?? 0) + 1;
  }
  return out;
}

describe("kolejka skoczni dnia", () => {
  it("idzie po 2 skoki: mała, średnia, mamucia i od nowa", () => {
    expect(order([0, 0, 0], 12)).toEqual([0, 0, 1, 1, 2, 2, 0, 0, 1, 1, 2, 2]);
  });

  it("po 30 skokach nie ma już skoczni", () => {
    const all = order([0, 0, 0], 31);
    expect(all.slice(0, 30).every((g) => g !== null)).toBe(true);
    expect(all[30]).toBeNull();
  });

  it("wyrównuje dzień zaczęty wolnym wyborem", () => {
    // 5 skoków na mamuciej (2 pełne pary), nic na pozostałych: mała i średnia doganiają ją po 2 skoki na zmianę.
    expect(order([0, 0, 5], 14)).toEqual([0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 2, 0]);
  });

  it("pomija skocznię z kompletem", () => {
    expect(nextHill([10, 3, 9], 3, 10)).toBe(1);
    expect(nextHill([10, 10, 9], 3, 10)).toBe(2);
  });
});
