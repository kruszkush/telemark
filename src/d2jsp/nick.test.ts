import { describe, expect, it } from "vitest";
import { jumperNick } from "./nick";

describe("jumperNick", () => {
  it("pisze nick wielkimi literami, polskie litery zostają", () => {
    expect(jumperNick("Żółw_Łukasz")).toBe("ŻÓŁW-ŁUKASZ");
  });
  it("znak spoza czcionki gry zamienia na kreskę i przycina do 25 znaków", () => {
    expect(jumperNick("a😀b")).toBe("A-B");
    expect(jumperNick("x".repeat(40))).toHaveLength(25);
  });
});
