// Szkic (Mateusz 14.11): gdzie i jak napisać „tydzień = 5 najlepszych dni z 7, miesiąc 20, rok 200” na karcie
// Telemarka na stronie licznika, bez upychania w jedno zdanie. Wzór: obecna karta i karty mistrzów postów (bez wzoru
// z zewnątrz). Prawdziwa strona testowa z ?tmdemo, w każdej wersji przestawiony tylko opis zasad (zmiana w DOM, strona
// nietknięta). Edge w tle, 2560×1440. Użycie: node proto/karta-zasady/zrzuty.mjs
import { mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";

const OUT = resolve("proto/karta-zasady/zrzuty");
const URL0 = "https://kruszkush.github.io/d2jsp-licznik/test/?tmdemo&t=" + Date.now();
const ENV = readFileSync("E:/Vibe coding/lotnik-serwer.env", "utf8");
const HASLO = (ENV.match(/TEST_HASLO=([^\s"\\]+)/) ?? [])[1] ?? "";
mkdirSync(OUT, { recursive: true });

// Wspólne dla wersji A–C: u góry zostaje krótko, co to za gra, a ▶ i nick osobnym zdaniem.
const TOP =
  "3 nowe skocznie codziennie o północy, ten sam wiatr dla wszystkich.<br>▶ odtwarza najlepszy skok (dzisiejsze od jutra), klik w nick pokazuje wszystkie skoki.";
const RULE = { y: "liczy się 200 najlepszych dni roku", m: "liczy się 20 najlepszych dni miesiąca", w: "liczy się 5 najlepszych dni z 7" };
const KIND = ["y", "m", "w"];

const VARIANTS = {
  "0-obecnie": () => {},
  "A-w-karcie-mistrza": (TOP, RULE, KIND) => {
    document.querySelector("#telemark .tm-rules").innerHTML = TOP;
    document.querySelectorAll("#telemark .tmc").forEach((c, i) => {
      const s = document.createElement("div");
      s.textContent = RULE[KIND[i]];
      s.style.cssText = "font-size:11px;color:var(--mute);margin-top:1px";
      c.querySelector(".lab").after(s);
    });
  },
  "B-w-wyscigu": (TOP, RULE, KIND) => {
    document.querySelector("#telemark .tm-rules").innerHTML = TOP;
    document.querySelectorAll("#telemark .tmr").forEach((c, i) => {
      const s = document.createElement("div");
      s.textContent = RULE[KIND[i]];
      s.style.cssText = "font-size:11px;color:var(--mute);margin:-2px 0 4px";
      c.querySelector("h4").after(s);
    });
  },
  "C-trzy-okienka-u-gory": (TOP) => {
    const r = document.querySelector("#telemark .tm-rules");
    const pill = (c, a, b) =>
      `<span style="display:inline-block;border:1px solid ${c};border-radius:8px;padding:3px 9px;margin:6px 6px 0 0;color:var(--ink)"><b style="color:${c}">${a}</b> · ${b}</span>`;
    r.innerHTML =
      TOP +
      "<br>" +
      pill("#3fb0d8", "Rok", "200 najlepszych dni") +
      pill("#a46ff0", "Miesiąc", "20 najlepszych dni") +
      pill("var(--gold)", "Tydzień", "5 najlepszych dni z 7");
  },
};

const browser = await chromium.launch({ channel: "msedge" });
const ctx = await browser.newContext({ viewport: { width: 2560, height: 1440 }, deviceScaleFactor: 1, colorScheme: "dark" });
await ctx.addInitScript((h) => localStorage.setItem("lotnik.haslo", h), HASLO);
const page = await ctx.newPage();
for (const [name, fn] of Object.entries(VARIANTS)) {
  await page.goto(URL0, { waitUntil: "domcontentloaded" });
  await page.locator("#telemark .tm-cols").waitFor({ timeout: 30000 });
  await page.waitForTimeout(800);
  await page.evaluate(`(${fn.toString()})(${JSON.stringify(TOP)}, ${JSON.stringify(RULE)}, ${JSON.stringify(KIND)})`);
  await page.waitForTimeout(300);
  await page.locator("#telemark").screenshot({ path: join(OUT, name + ".png") });
  console.log("zrzut", name);
}
await browser.close();
