import { describe, expect, it } from "vitest";
import { HILL_GROUPS, nextTrainingHill, randomTrainingHillId } from "./daily";
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

  it("zostaje na dwa skoki, potem nowa; dzisiejsza skocznia dnia od razu nowa", () => {
    const first = nextTrainingHill(null, []);
    expect(nextTrainingHill({ id: first.id, jumps: 1 }, [])).toEqual({ id: first.id, jumps: 1 });
    expect(nextTrainingHill({ id: first.id, jumps: 2 }, []).id).not.toBe(first.id);
    expect(nextTrainingHill({ id: first.id, jumps: 0 }, [first.id]).id).not.toBe(first.id);
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
