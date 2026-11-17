// Szkic (Mateusz 18.11): średnia na dzień obok sumy w wyścigach, żeby ktoś, kto dołączył później, widział,
// czy przegrywa umiejętnościami, czy liczbą dni. Prawdziwa strona główna z prawdziwymi danymi; przerobione tylko
// wiersze wyścigów (DOM, strona nietknięta), jak w proto/wyscig-info. Średnia = suma / liczone dni (najwyżej tyle,
// ile liczy wyścig, bo suma to tylko najlepsze dni). Edge w tle, 2560×1440.
// Wersje: A pod sumą mały szary napis, B w jednej linii obok sumy, C w szarej linijce pod nickiem.
// Użycie (z folderu telemark): node proto/srednia-dnia/zrzuty.mjs
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";

const OUT = resolve("proto/srednia-dnia/zrzuty");
const URL0 = "https://kruszkush.github.io/d2jsp-licznik/?t=" + Date.now();
const API = "https://us-east1-rich-chimera-344319.cloudfunctions.net/lotnik/tm/tabele";
mkdirSync(OUT, { recursive: true });

async function variant(v, API) {
  const j = await (await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).json();
  const today = new Map((j.dzis || []).map((r) => [r.uid, r.skoki]));
  const DNI = { y: 200, m: 20, w: 5 };
  const races = document.querySelectorAll("#telemark .tmr");
  const whole = (x) => String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  ["y", "m", "w"].forEach((k, ci) => {
    const o = j.okresy.find((x) => x.k === k);
    const n = o.dni || DNI[k];
    const box = races[ci];
    const lead = (o.rows[0] && o.rows[0].suma) || 1;
    const old = [...box.querySelectorAll("li")];
    const html = o.rows.slice(0, 5).map((r, i) => {
      const sk = today.get(r.uid) || 0;
      const days = Math.min(r.dni || 0, n);
      const avg = days ? whole(r.suma / days) : "0";
      const dzis = sk ? `dziś ${sk}/30` : "dziś nie skakał";
      const subTxt = `${r.dni || 0} z ${n} dni, ${dzis}` + (v === "C" ? `</div><div class="tm-sub">średnio ${avg} pkt na dzień` : "");
      let val;
      if (v === "A") val = `<span class="v" style="display:flex;flex-direction:column;align-items:flex-end;line-height:1.15">${whole(r.suma)}<small style="font-size:10px;opacity:.85">${avg}/dzień</small></span>`;
      else val = `<span class="v">${whole(r.suma)}</span>`;
      const nm = old[i] ? old[i].querySelector(".nm").outerHTML : `<div class="nm">${r.nick}</div>`;
      const play = old[i] && old[i].lastElementChild && !old[i].lastElementChild.classList.contains("v") ? old[i].lastElementChild.outerHTML : "";
      return `<li><span class="pos ${r.place <= 3 ? "p" + r.place : ""}">${r.place}</span><div class="grow">${nm}<div class="tm-sub">${subTxt}</div>` +
        `<div class="track"><i style="width:${(r.suma / lead) * 100}%"></i></div></div>${val}${play}</li>`;
    }).join("");
    box.querySelector("ul").innerHTML = html;
  });
}

const browser = await chromium.launch({ channel: "msedge" });
const ctx = await browser.newContext({ viewport: { width: 2560, height: 1440 }, deviceScaleFactor: 1, colorScheme: "dark" });
const page = await ctx.newPage();
for (const v of ["0", "A", "C"]) {
  await page.goto(URL0, { waitUntil: "domcontentloaded" });
  await page.locator("#telemark .tm-races .tmr ul").first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(1500);
  if (v !== "0") await page.evaluate(`(${variant.toString()})(${JSON.stringify(v)}, ${JSON.stringify(API)})`);
  await page.waitForTimeout(300);
  await page.locator("#telemark .tm-races").screenshot({ path: join(OUT, v + ".png") });
  console.log("zrzut", v);
}
await browser.close();
