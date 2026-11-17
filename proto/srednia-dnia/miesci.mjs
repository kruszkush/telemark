// Pomiar (Mateusz 18.11): czy szara linijka pod nickiem w wyścigach mieści się cała (bez „…”), także przy średniej
// od 1000 punktów. Dla każdego wiersza: ile pikseli brakuje (szerokość tekstu minus miejsce). FAIL, gdy brakuje > 0.
// Użycie (z folderu telemark): node proto/srednia-dnia/miesci.mjs [adres]   (domyślnie strona testowa z ?tmdemo)
import { chromium } from "@playwright/test";

const url = process.argv[2] || "https://kruszkush.github.io/d2jsp-licznik/test/?tmdemo";
const browser = await chromium.launch({ channel: "msedge" });
let fail = 0;
for (const w of [2560, 1920, 1366]) {
  const page = await browser.newPage({ viewport: { width: w, height: 1200 } });
  await page.goto(url + (url.includes("?") ? "&" : "?") + "t=" + Date.now());
  await page.locator("#telemark .tm-races .tmr li .tm-sub").first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(1500);
  const rows = await page.$$eval("#telemark .tmr li", (lis) => lis.map((li) => {
    const s = li.querySelector(".tm-sub"), n = li.querySelector(".nk");
    return { t: s ? s.textContent : "", brak: s ? s.scrollWidth - s.clientWidth : 0, nick: n ? n.scrollWidth - n.clientWidth : 0,
      avg: (li.querySelector(".tm-avg, .v small") || {}).textContent || "" };
  }));
  for (const r of rows) if (r.brak > 0 || r.nick > 0) { fail++; console.log(`${w}px: brakuje ${r.brak} px w „${r.t}” (średnia ${r.avg}), nick ${r.nick} px`); }
  console.log(`${w}px: wierszy ${rows.length}, najwięcej brakuje ${Math.max(0, ...rows.map((r) => r.brak))} px`);
  // Najdłuższy możliwy napis (koniec roku liczącego 200 dni) w każdym wierszu: ile by brakowało.
  const dl = await page.$$eval("#telemark .tmr li .tm-sub", (ss) => ss.map((s) => { s.textContent = "200 z 200 dni, dziś nie skakał"; return s.scrollWidth - s.clientWidth; }));
  console.log(`${w}px: przy „200 z 200 dni, dziś nie skakał” najwięcej brakuje ${Math.max(...dl)} px (tylko informacja)`);
  await page.close();
}
await browser.close();
console.log(fail ? "FAIL" : "OK");
