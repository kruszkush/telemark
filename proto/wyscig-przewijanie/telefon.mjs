// Telefon (Mateusz 18.11: „sprawdź na telefonie”): strona główna z lokalnym d2jsp/strona.js na udawanym ekranie
// Xiaomi Mi Note 10 (393×873, dotyk). Każdy wyścig: przesunięcie palcem w górę po liście; czy lista się przewinęła
// i czy strona stała w miejscu (palec na liście nie ma przewijać całej strony, póki lista ma co przewijać).
// Druga próba: przesunięcie poza listą przewija stronę. Zrzuty do <folder>.
// Użycie (z folderu telemark): node proto/wyscig-przewijanie/telefon.mjs <folder>
import { chromium } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";

const out = process.argv[2] || "proto/wyscig-przewijanie/telefon";
mkdirSync(out, { recursive: true });
const local = readFileSync("d2jsp/strona.js", "utf8");
const browser = await chromium.launch({ channel: "msedge" });
const ctx = await browser.newContext({ viewport: { width: 393, height: 873 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
// ZYWO=1: opublikowana strona bez podmiany pliku (sprawdzenie po publikacji).
if (!process.env.ZYWO) await page.route(/telemark\/strona\.js/, (r) => r.fulfill({ body: local, contentType: "text/javascript" }));
await page.goto("https://kruszkush.github.io/d2jsp-licznik/?t=" + Date.now(), { waitUntil: "domcontentloaded", timeout: 60000 });
await page.locator("#telemark .tmr li").first().waitFor({ timeout: 60000 });
await page.waitForTimeout(1500);
const cdp = await ctx.newCDPSession(page);
// Palec: dotknięcie, 20 małych ruchów w górę co 16 ms, puszczenie (jak przesunięcie na prawdziwym ekranie).
async function swipe(x, y, dy) {
  const at = (yy) => [{ x, y: yy, id: 1 }];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: at(y) });
  for (let k = 1; k <= 20; k++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: at(y - (dy * k) / 20) });
    await new Promise((r) => setTimeout(r, 16));
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}
let fail = 0;
const races = page.locator("#telemark .tmr");
for (let i = 0; i < (await races.count()); i++) {
  const ul = races.nth(i).locator("ul");
  await ul.evaluate((u) => u.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/${i}-przed.png` });
  const b = await ul.boundingBox();
  const y0 = await page.evaluate(() => scrollY);
  await swipe(b.x + b.width / 2, b.y + b.height * 0.7, 200);
  await page.waitForTimeout(500);
  const s = await ul.evaluate((u) => ({ top: Math.round(u.scrollTop), max: u.scrollHeight - u.clientHeight }));
  const y1 = await page.evaluate(() => scrollY);
  await page.screenshot({ path: `${out}/${i}-po.png` });
  const ok = s.top > 0 && Math.abs(y1 - y0) < 2;
  if (!ok) fail++;
  console.log(`wyścig ${i + 1}: lista przewinięta o ${s.top} z ${s.max} px, strona przesunęła się o ${y1 - y0} px ${ok ? "OK" : "FAIL"}`);
}
// Lista już na końcu: kolejne przesunięcie palcem po niej ma przewinąć stronę, żeby nie „zaciąć się” na liście.
for (const [opis, el] of [["po liście przewiniętej do końca", races.last().locator("ul")], ["po napisie pod listą", races.last().locator(".end").first()]]) {
  const b = await el.boundingBox();
  const y0 = await page.evaluate(() => scrollY);
  await swipe(b.x + b.width / 2, b.y + Math.min(b.height / 2, 40), 200);
  await page.waitForTimeout(500);
  const moved = (await page.evaluate(() => scrollY)) - y0;
  console.log(`przesunięcie ${opis} przewija stronę o ${moved} px ${moved > 0 ? "OK" : "FAIL"}`);
  if (moved <= 0) fail++;
}
await browser.close();
console.log(fail ? "FAIL" : "OK");
