// Sprawdzenie średniej na dzień na prawdziwej stronie (test albo prod): czeka, aż strona pokaże „/dzień”
// (GitHub Pages wystawia z opóźnieniem), robi zrzut wyścigów 2560×1440 i wypisuje sumę, dni i średnią z wierszy.
// Użycie (z folderu telemark): node proto/srednia-dnia/sprawdz.mjs test|prod
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const tryb = process.argv[2] || "test";
const base = tryb === "prod" ? "https://kruszkush.github.io/d2jsp-licznik/" : "https://kruszkush.github.io/d2jsp-licznik/test/";
mkdirSync(resolve("proto/srednia-dnia/zywo"), { recursive: true });
const browser = await chromium.launch({ channel: "msedge" });
const ctx = await browser.newContext({ viewport: { width: 2560, height: 1440 }, colorScheme: "dark" });
const page = await ctx.newPage();
// Najpierw samo pobranie skryptu (kilka sekund), dopiero gdy ma nowy kod, jeden zrzut (18.11: pętla zrzutów stała 6 min).
for (let i = 0; ; i++) {
  const js = await (await fetch(base + "telemark/strona.js?t=" + Date.now())).text();
  if (js.includes(process.env.ZNAK || "tm-avg.top")) break;
  if (i >= 30) { console.log("FAIL: strona nie ma nowego kodu po 5 min"); process.exit(1); }
  await new Promise((r) => setTimeout(r, 10000));
}
await page.goto(base + "?t=" + Date.now(), { waitUntil: "domcontentloaded" });
await page.locator("#telemark .tm-races .tmr").first().waitFor({ timeout: 30000 });
await page.waitForTimeout(3000);
const ok = (await page.locator("#telemark .tmr .tm-avg").count()) > 0;
console.log("średnich:", await page.locator("#telemark .tmr .tm-avg").count(), "wyróżnionych:", await page.locator("#telemark .tmr .tm-avg.top").count());
console.log("wersja:", await page.locator(".ver").first().textContent().catch(() => "?"));
for (const box of await page.locator("#telemark .tmr").all()) {
  console.log((await box.locator("h4").textContent()) + " | " + (await box.locator(".rule").textContent()));
  for (const li of await box.locator("li").all()) {
    const t = (await li.innerText()).replace(/\s+/g, " ");
    console.log("  " + t);
  }
}
await page.locator("#telemark .tm-races").screenshot({ path: resolve(`proto/srednia-dnia/zywo/${tryb}.png`) });
await browser.close();
console.log(ok ? "OK" : "FAIL: brak średniej na stronie");
