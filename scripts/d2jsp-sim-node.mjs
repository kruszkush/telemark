// Krok 1 docs/plan_d2jsp.md: plik symulacji serwera (dist-d2jsp-sim/telemark-sim-<wersja>.mjs) liczy zestaw próbnych
// skoków (src/d2jsp/test-support/jump-set.json) i porównuje z wynikiem gry. Uruchom tym Node, który ma serwer (22):
//   <node22> scripts/d2jsp-sim-node.mjs [plik.mjs]
import { readFileSync, readdirSync } from "node:fs";
import { pathToFileURL } from "node:url";

const file = process.argv[2] ?? "dist-d2jsp-sim/" + readdirSync("dist-d2jsp-sim").find((f) => f.endsWith(".mjs"));
const sim = await import(pathToFileURL(file).href);
/** Dzień, w którym działają przeliczniki wiatru (każdy okres zaczyna się wcześniej). */
const WIND_DAY = "2099-01-01";
const set = JSON.parse(readFileSync("src/d2jsp/test-support/jump-set.json", "utf8"));
// Punkty za wiatr tych skoków w dniu z przelicznikami, jak liczy gra (src/d2jsp/wind-points.test.ts zapisuje plik).
const wind = JSON.parse(readFileSync("src/d2jsp/test-support/jump-set-wind.json", "utf8"));
let bad = 0;
let worst = 0;
set.forEach((j, i) => {
  const t0 = performance.now();
  const r = sim.checkJump(j.hillId, j.seed, j.inputs, WIND_DAY);
  worst = Math.max(worst, performance.now() - t0);
  const got = "error" in r ? r : { distanceM: r.distanceM, points: r.points, fell: r.fell, frames: r.frames };
  const gotWind = "error" in r ? null : { windMPerS: r.windMPerS, windPoints: r.windPoints, pointsWithWind: r.pointsWithWind };
  const want = JSON.stringify(j.atTouchdown) + JSON.stringify(wind[i]);
  if (JSON.stringify(got) + JSON.stringify(gotWind) !== want) {
    bad++;
    if (bad <= 5) console.log("RÓŻNICA", j.hillId, j.seed, JSON.stringify(r), "gra:", want);
  }
});
console.log(
  `Node ${process.version}, ${file}: ${set.length - bad}/${set.length} zgodnych, najdłuższy skok ${worst.toFixed(1)} ms`,
);
process.exit(bad ? 1 : 0);
