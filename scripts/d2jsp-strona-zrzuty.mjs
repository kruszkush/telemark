// Zrzuty strony testowej licznika z Telemarkiem (plan docs/plan_d2jsp.md krok 4–6): Edge w tle, 2560×1440 (monitor
// Mateusza) i telefon 390×844; karta z tabelami, okno gry, ▶ (dzisiejszy skok przez &test, tylko serwer testowy).
// Użycie: node scripts/d2jsp-strona-zrzuty.mjs <folder> [adres strony]
import { mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";

const OUT = resolve(process.argv[2] ?? "test-results/d2jsp-strona");
const URL0 = process.argv[3] ?? "https://kruszkush.github.io/d2jsp-licznik/test/";
const ENV = readFileSync("E:/Vibe coding/lotnik-serwer.env", "utf8");
const HASLO = (ENV.match(/TEST_HASLO=([^\s"\\]+)/) ?? [])[1] ?? "";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "msedge" });
const errors = [];
async function pageOf(viewport, mobile) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  await ctx.addInitScript((h) => {
    try {
      localStorage.setItem("lotnik.haslo", h);
    } catch {
      /* brak pamięci */
    }
  }, HASLO);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  return page;
}

const page = await pageOf({ width: 2560, height: 1440 }, false);
await page.goto(URL0 + "?t=" + Date.now(), { waitUntil: "domcontentloaded" });
await page.locator("#telemark table, #telemark .tm-empty").first().waitFor({ timeout: 30000 });
console.log("wersja:", await page.locator(".ver").first().textContent());
await page.locator("#telemark").scrollIntoViewIfNeeded();
await page.screenshot({ path: join(OUT, "01-strona.png") });
await page.locator("#telemark").screenshot({ path: join(OUT, "02-karta.png") });
console.log("tabele:", (await page.locator("#telemark").innerText()).slice(0, 900));
// Skok konta próbnego z d2jsp-proba.mjs (zagrany w przeglądarce), inaczej pierwszy w tabeli.
const KONTO = "E:/Vibe coding/lotnik/out/_tm-konto-testowe.log";
const mine = (() => {
  try {
    return JSON.parse(readFileSync(KONTO, "utf8")).nick;
  } catch {
    return null;
  }
})();
const row = mine ? page.locator("#tm-w tr", { hasText: mine }) : page.locator("#tm-w tr").nth(1);
const gid = await row.locator("[data-gid]").first().getAttribute("data-gid");
console.log("oglądany skok:", mine ?? "pierwszy", gid, await row.innerText());

await page.getByRole("button", { name: "Telemark – zagraj", exact: true }).click();
const game = page.frameLocator(".tm-okno iframe");
await game.getByRole("heading", { name: "Skocznie dnia" }).waitFor({ timeout: 30000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: join(OUT, "03-okno-gry.png") });
await page.getByRole("button", { name: "Zamknij Telemark" }).click();
await page.waitForTimeout(500);
console.log(
  "po zamknięciu okno ukryte:",
  await page.locator(".tm-okno").isHidden(),
  "strona widoczna:",
  await page.locator("h1").isVisible(),
);

if (gid) {
  // Dzisiejszy skok (przycisk ▶ na stronie czeka do jutra): ta sama gra z ?ogladaj= i &test.
  await page.goto(URL0 + "telemark/index.html?ogladaj=" + gid + "&test", { waitUntil: "domcontentloaded" });
  await page.locator("canvas").waitFor({ timeout: 30000 });
  for (const [i, ms] of [
    [4, 2500],
    [5, 6000],
    [6, 6000],
  ]) {
    await page.waitForTimeout(ms);
    await page.screenshot({ path: join(OUT, `0${i}-ogladanie.png`) });
  }
}

const phone = await pageOf({ width: 390, height: 844 }, true);
await phone.goto(URL0 + "?t=" + Date.now(), { waitUntil: "domcontentloaded" });
await phone.locator("#telemark table, #telemark .tm-empty").first().waitFor({ timeout: 30000 });
await phone.locator("#telemark").scrollIntoViewIfNeeded();
await phone.screenshot({ path: join(OUT, "07-telefon-karta.png") });
await phone.getByRole("button", { name: "Telemark – zagraj", exact: true }).click();
await phone.frameLocator(".tm-okno iframe").getByRole("heading", { name: "Skocznie dnia" }).waitFor({ timeout: 30000 });
await phone.waitForTimeout(2000);
await phone.screenshot({ path: join(OUT, "08-telefon-okno.png") });
console.log("szerokość strony na telefonie:", await phone.evaluate(() => document.documentElement.scrollWidth));
console.log("błędy strony:", errors.length ? errors : "brak");
await browser.close();
