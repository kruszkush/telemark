// Szkic (Mateusz 16.11): w wyścigu nie widać, czy gracz oddał już wszystkie skoki i ile dni mu się liczy.
// Prawdziwa strona główna z prawdziwymi danymi; w każdej wersji przerobione tylko wiersze wyścigów (DOM, strona nietknięta),
// top 5 zamiast top 3. Wersja A: szara linijka pod nickiem. Wersja B: kropki dni i znaczek dzisiejszego dnia.
// Jeden wiersz (3. w tygodniu) dostaje przykładowy stan „dziś 12 z 30”, bo dziś wszyscy skończyli. Edge w tle, 2560×1440.
// Użycie (z folderu telemark): node proto/wyscig-info/zrzuty.mjs
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";

const OUT = resolve("proto/wyscig-info/zrzuty");
const URL0 = "https://kruszkush.github.io/d2jsp-licznik/?t=" + Date.now();
const API = "https://us-east1-rich-chimera-344319.cloudfunctions.net/lotnik/tm/tabele";
mkdirSync(OUT, { recursive: true });

async function variant(v, API) {
  const j = await (await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).json();
  const today = new Map((j.dzis || []).map((r) => [r.uid, r.skoki]));
  const N = { y: 200, m: 20, w: 5 };
  const races = document.querySelectorAll("#telemark .tmr");
  ["y", "m", "w"].forEach((k, ci) => {
    const o = j.okresy.find((x) => x.k === k);
    const box = races[ci];
    const lead = (o.rows[0] && o.rows[0].suma) || 1;
    const html = o.rows.slice(0, 5).map((r, i) => {
      let sk = today.has(r.uid) ? today.get(r.uid) : 0;
      if (k === "w" && i === 2) sk = 12; // przykład: ktoś jeszcze skacze
      let extra = "", inline = "";
      if (v === "A") {
        const t = sk >= 30 ? "dziś 30/30 skoków" : sk ? `dziś ${sk}/30 skoków` : "dziś nie skakał";
        extra = `<div style="font-size:11px;color:var(--mute);line-height:1.3">${r.dni} z ${N[k]} dni, ${t}</div>`;
      }
      if (v === "B") {
        const days = k === "w"
          ? `<span style="display:inline-flex;gap:2px">${[0, 1, 2, 3, 4].map((d) => `<i style="width:6px;height:6px;border-radius:50%;${d < r.dni ? "background:var(--c)" : "border:1px solid var(--mute);box-sizing:border-box"}"></i>`).join("")}</span>`
          : `<span style="font-size:11px;color:var(--mute)">${r.dni} d</span>`;
        const mark = sk >= 30 ? `<span title="dziś skończył" style="color:#3fbf6f;font-size:12px">✓</span>`
          : sk ? `<span title="dziś jeszcze skacze" style="color:var(--mute);font-size:11px">${sk}/30</span>`
          : `<span title="dziś jeszcze nie skakał" style="color:var(--mute);font-size:11px">○</span>`;
        extra = `<span style="flex:none;display:inline-flex;gap:6px;align-items:center">${days}${mark}</span>`;
      }
      const nick = `<button type="button" class="nk">${r.nick}</button>`;
      return `<li><span class="pos ${r.place <= 3 ? "p" + r.place : ""}">${r.place}</span><div class="grow"><div class="nm">${nick}</div>${v === "A" ? extra : ""}` +
        `<div class="track"><i style="width:${(r.suma / lead) * 100}%"></i></div></div>${v === "B" ? extra : ""}<span class="v">${Math.round(r.suma).toLocaleString("pl-PL")}</span><span class="pl-e"></span></li>`;
    }).join("");
    box.querySelector("ul").innerHTML = html;
    if (v === "B" && ci === 2) {
      const leg = document.createElement("div");
      leg.style.cssText = "font-size:11px;color:var(--mute);margin-top:4px";
      leg.innerHTML = "● dzień, który się liczy · ✓ dziś skończył · 12/30 dziś jeszcze skacze";
      box.querySelector(".end").before(leg);
    }
    if (v !== "0") {
      const hint = document.createElement("div");
      hint.style.cssText = "font-size:11px;color:var(--mute);margin-top:2px";
      hint.textContent = "klik w nick pokazuje wszystkie skoki gracza";
      box.querySelector(".end").after(hint);
    }
  });
}

const browser = await chromium.launch({ channel: "msedge" });
const ctx = await browser.newContext({ viewport: { width: 2560, height: 1440 }, deviceScaleFactor: 1, colorScheme: "dark" });
const page = await ctx.newPage();
for (const v of ["0", "A", "B"]) {
  await page.goto(URL0, { waitUntil: "domcontentloaded" });
  await page.locator("#telemark .tm-races .tmr ul").first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(1000);
  if (v !== "0") await page.evaluate(`(${variant.toString()})(${JSON.stringify(v)}, ${JSON.stringify(API)})`);
  await page.waitForTimeout(300);
  await page.locator("#telemark .tm-races").screenshot({ path: join(OUT, v + ".png") });
  console.log("zrzut", v);
}
await browser.close();
