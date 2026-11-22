import { describe, expect, it } from "vitest";
import { HILL_GROUPS, randomTrainingHillId } from "./daily";
import { ownHill } from "./jump-check";

const ALL = HILL_GROUPS.flatMap((g) => g.ids);

describe("skocznia treningowa", () => {
  it("losuje każdą skocznię poza dzisiejszymi i poprzednią", () => {
    const today = ["own-14", "own-24", "own-30"];
    const seen = new Set<string>();
    for (let i = 0; i < ALL.length; i++) {
      seen.add(randomTrainingHillId("own-20", today, () => i / ALL.length));
    }
    for (const id of seen) expect(ownHill(id)).toBeTruthy();
    expect([...seen].toSorted()).toEqual(ALL.filter((id) => !today.includes(id) && id !== "own-20").toSorted());
  });

  it("nie daje dwa razy z rzędu tej samej", () => {
    let prev: string | null = null;
    for (let i = 0; i < 200; i++) {
      const next = randomTrainingHillId(prev, []);
      expect(next).not.toBe(prev);
      prev = next;
    }
  });
});
