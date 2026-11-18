// Sprawdzenie (Mateusz 18.11: „można scrollować listę osób, które uczestniczą, bo teraz się nie da”): strona główna
// z lokalnym d2jsp/strona.js. Dla każdego wyścigu: ile osób ma serwer, ile wierszy jest w liście, ile widać bez
// przewijania, czy po przewinięciu kółkiem widać ostatnią osobę. Zrzuty przed i po przewinięciu do <folder>.
// Użycie (z folderu telemark): node proto/wyscig-przewijanie/sprawdz.mjs <folder> [adres]
import { chromium } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";

const out = process.argv[2] || "proto/wyscig-przewijanie/zrzuty";
const url = process.argv[3] || "https://kruszkush.github.io/d2jsp-licznik/";
mkdirSync(out, { recursive: true });
const local = readFileSync(process.env.PLIK || "d2jsp/strona.js", "utf8"); // PLIK=stara wersja do porównania
const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 2560, height: 1440 } });
await page.route(/telemark\/strona\.js/, (r) => r.fulfill({ body: local, contentType: "text/javascript" }));
let api = null;
page.on("response", async (r) => { if (r.url().endsWith("/tm/tabele")) api = await r.json().catch(() => null); });
await page.goto(url + "?t=" + Date.now(), { waitUntil: "domcontentloaded", timeout: 60000 });
await page.locator("#telemark .tmr li").first().waitFor({ timeout: 30000 });
await page.waitForTimeout(1500);
const races = page.locator("#telemark .tmr");
await races.first().scrollIntoViewIfNeeded();
await page.mouse.wheel(0, 0);
await page.locator("#telemark .tm-races").screenshot({ path: `${out}/przed.png` });
let fail = 0;
const n = await races.count();
for (let i = 0; i < n; i++) {
  const ul = races.nth(i).locator("ul");
  const s = await ul.evaluate((u) => {
    const box = u.getBoundingClientRect();
    const lis = [...u.children];
    const vis = lis.filter((l) => { const b = l.getBoundingClientRect(); return b.top >= box.top - 1 && b.bottom <= box.bottom + 1; }).length;
    return { k: u.parentElement.dataset.k, rows: lis.length, vis, h: Math.round(box.height) };
  });
  const want = api ? (api.okresy.find((o) => o.k === s.k) || { rows: [] }).rows.length : -1;
  const b = await ul.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.wheel(0, 1000);
  await page.waitForTimeout(400);
  const lastVisible = await ul.evaluate((u) => {
    const box = u.getBoundingClientRect(), l = u.lastElementChild.getBoundingClientRect();
    return l.bottom <= box.bottom + 1 && l.top >= box.top - 1;
  });
  const ok = s.rows === want && s.vis === Math.min(5, want) && lastVisible;
  if (!ok) fail++;
  console.log(`${s.k}: osób na serwerze ${want}, wierszy ${s.rows}, widać naraz ${s.vis} (${s.h} px), ostatnia osoba po przewinięciu ${lastVisible ? "widoczna" : "NIE"} ${ok ? "OK" : "FAIL"}`);
}
await page.locator("#telemark .tm-races").screenshot({ path: `${out}/po.png` });
await browser.close();
console.log(fail ? "FAIL" : "OK");
