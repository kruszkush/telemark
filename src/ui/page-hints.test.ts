import { describe, expect, it } from "vitest";
import { sentenceCase } from "./page-hints";

describe("hints on the gate in page text", () => {
  it("writes the picture's capitals as a sentence and keeps the touch fields' names", () => {
    expect(sentenceCase("PRZYCISK TUŻ NAD ZIEMIĄ: TELEMARK")).toBe("Przycisk tuż nad ziemią: telemark");
    expect(sentenceCase("L+P NA PROGU: WYBICIE")).toBe("L+P na progu: wybicie");
    expect(sentenceCase("SZYBKO ZNOWU P: WĄSKI TELEMARK")).toBe("Szybko znowu P: wąski telemark");
    expect(sentenceCase("PRZECIĄGAJ W POLU L: POCHYLENIE")).toBe("Przeciągaj w polu L: pochylenie");
  });
});
