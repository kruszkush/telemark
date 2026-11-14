import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { DayRecords, DayState } from "./api";
import { HillCard, recordFor } from "./hill-card";

const SMALL = { id: "own-1", name: "Wrzosowa", kPointM: 70 };
const HILLS = [SMALL, { id: "own-2", name: "Jodłowa", kPointM: 135 }, { id: "own-3", name: "Lodowiec", kPointM: 265 }];
const DAY: DayState = {
  day: "2026-11-14",
  hills: HILLS,
  limit: 10,
  sim: "1.0.0",
  konto: { nick: "Ja", verified: true },
  uzyte: [3, 2, 2],
  najlepsze: [[{ p: 5, gid: "a", m: 37.5, fell: true }, { p: 18.5, gid: "b", m: 28 }], [], []],
  sumy: [23.5, 0, 0],
  wynik: 23.5,
};
const rec = (hill: string, m: number, nick = "Kupcia") => ({ hill, nick, uid: null, m, day: "2026-11-02" });
const card = (records: DayRecords | null, day: DayState = DAY) =>
  renderToStaticMarkup(
    createElement(HillCard, { hill: SMALL, g: 0, day, records, next: 0, starting: false, onJump: () => {}, onTrial: () => {} }),
  );

describe("karta skoczni", () => {
  it("rekord dnia i rekord skoczni z metrami, nickiem i datą", () => {
    const html = card({ dzis: [rec("own-1", 68.5), null, null], skocznia: [rec("own-1", 74, "Pozdrawiam"), null, null] });
    expect(html).toContain("Rekord dnia");
    expect(html).toContain("68,5 m");
    expect(html).toContain("Pozdrawiam");
    expect(html).toContain("74,0 m");
    expect(html).toContain("2.11");
  });
  it("bez rekordu: jeszcze nikt", () => {
    const html = card({ dzis: [null, null, null], skocznia: [null, null, null] });
    expect(html.match(/jeszcze nikt/g)?.length).toBe(2);
  });
  it("rekord innej skoczni (po północy) pominięty", () => {
    expect(recordFor([rec("own-9", 99)], 0, "own-1")).toBeNull();
    const html = card({ dzis: [rec("own-9", 99), null, null], skocznia: [null, null, null] });
    expect(html).not.toContain("99,0 m");
    expect(html.match(/jeszcze nikt/g)?.length).toBe(2);
  });
  it("skoki gracza ze słowem upadek, kwadraciki i Razem", () => {
    const html = card(null);
    expect(html).toContain("Twoje 2 najlepsze skoki");
    expect(html).toContain("upadek");
    expect(html.match(/d2-dot-used/g)?.length).toBe(3);
    expect(html).toContain("23,5 pkt");
    expect(html).toContain("Skacz (skok 4 z 10)");
  });
  it("gość: rekordy i skok na próbę, bez skoków gracza", () => {
    const html = card({ dzis: [rec("own-1", 50), null, null], skocznia: [null, null, null] }, { ...DAY, gosc: "x" });
    expect(html).toContain("50,0 m");
    expect(html).toContain("Skacz na próbę");
    expect(html).not.toContain("Twoje 2 najlepsze");
  });
});
