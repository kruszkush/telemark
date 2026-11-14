import { describe, expect, it } from "vitest";
import { D2_TEXT as T } from "../text/d2jsp-text";

describe("ekran Skoki gracza: nazwy okresów jak na stronie licznika", () => {
  it("tydzień: miesiąc czwartku, tydzień 1 z 1. dniem miesiąca", () => {
    expect(T.playerPeriod("w2026-46", 767.7, 5)).toBe("Listopad · tydzień 3: 767,7 pkt (liczy się 5 najlepszych dni).");
    expect(T.playerPeriod("w2026-45", 1, 5)).toMatch(/^Listopad · tydzień 2:/);
    expect(T.playerPeriod("w2026-01", 1, 5)).toMatch(/^Styczeń · tydzień 1:/);
  });
  it("miesiąc i rok", () => {
    expect(T.playerPeriod("m2026-11", 10, 20)).toMatch(/^Listopad 2026: 10,0 pkt/);
    expect(T.playerPeriod("y2026", 10, 200)).toMatch(/^Rok 2026:.*200 najlepszych dni/);
  });
});
