/**
 * Która skocznia jest na kolejce (zasady_d2jsp.md, „Skocznie i skoki”): 2 skoki na małej, 2 na średniej, 2 na
 * mamuciej i od nowa. Wybiera skocznię z najmniejszą liczbą pełnych par skoków, przy remisie pierwszą z kolei;
 * skocznie z kompletem skoków odpadają. Dzień zaczęty jeszcze wolnym wyborem też się w ten sposób wyrównuje.
 * Zwraca null, gdy wszystkie skoki są wykorzystane.
 */
export function nextHill(used: readonly number[], hills: number, limit: number): number | null {
  let best: number | null = null;
  let bestPairs = Infinity;
  for (let g = 0; g < hills; g++) {
    const n = used[g] ?? 0;
    if (n >= limit) continue;
    const pairs = Math.floor(n / 2);
    if (pairs < bestPairs) {
      best = g;
      bestPairs = pairs;
    }
  }
  return best;
}
