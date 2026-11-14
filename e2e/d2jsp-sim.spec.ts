import { readFileSync, readdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

// Krok 1 docs/plan_d2jsp.md: ten sam plik symulacji, który liczy skoki na serwerze (Node 22), w silniku przeglądarki
// daje te same metry, punkty i upadek co gra dla całego zestawu próbnych skoków (src/d2jsp/test-support/jump-set.json).
// Plik musi być zbudowany: node node_modules/vite/bin/vite.js build -c vite.d2jsp-sim.config.ts
const DIR = "dist-d2jsp-sim/";
const FILE = readdirSync(DIR).find((f) => f.endsWith(".mjs")) ?? "";
const ORIGIN = "http://sim.d2jsp.test";

test("plik symulacji serwera liczy w przeglądarce te same skoki co gra", async ({ page }) => {
  const set = JSON.parse(readFileSync("src/d2jsp/test-support/jump-set.json", "utf8")) as {
    hillId: string;
    seed: number;
    inputs: string;
    atTouchdown: unknown;
  }[];
  await page.route(`${ORIGIN}/**`, (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/sim.mjs") {
      return route.fulfill({ contentType: "text/javascript", body: readFileSync(DIR + FILE, "utf8") });
    }
    return route.fulfill({ contentType: "text/html", body: "<!doctype html><title>sim</title><body></body>" });
  });
  await page.goto(`${ORIGIN}/`);
  const got = await page.evaluate(
    async ({ jumps, src }) => {
      const sim = (await import(src)) as {
        checkJump: (h: string, s: number, i: string) => unknown;
      };
      return jumps.map((j) => sim.checkJump(j.hillId, j.seed, j.inputs));
    },
    { jumps: set.map(({ hillId, seed, inputs }) => ({ hillId, seed, inputs })), src: `${ORIGIN}/sim.mjs` },
  );
  expect(got).toEqual(set.map((j) => j.atTouchdown));
});
