// Zrzuty nart Telemarka na stronie licznika (plan docs/plan_puchary_narty.md): Edge w tle, 2560×1440, ciemny wygląd,
// przykładowe dane (?tmdemo&demo). Karta Telemarka, galeria sław, legenda, telefon, iskry z płonących nart w klatkach co 50 ms.
// Użycie: node proto/puchary-telemark/zrzuty-strona.mjs <folder> <adres strony> [klatki]
import { mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";

const OUT = resolve(process.argv[2]);
const URL0 = process.argv[3];
const KLATKI = process.argv[4] === "klatki";
const HASLO = (readFileSync("E:/Vibe coding/lotnik-serwer.env", "utf8").match(/TEST_HASLO=([^\s"\\]+)/) ?? [])[1] ?? "";
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: "msedge" });
const errors = [];
async function pageOf(viewport, mobile) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, colorScheme: "dark" });
  await ctx.addInitScript((h) => { try { localStorage.setItem("lotnik.haslo", h); } catch { /* brak pamięci */ } }, HASLO);
  await ctx.addInitScript(() => {
    Element.prototype.requestPointerLock = () => Promise.reject(new DOMException("no lock in tests", "NotSupportedError"));
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  return page;
}
const shot = async (page, name, el) => {
  await (el ? page.locator(el).first().screenshot({ path: join(OUT, name) }) : page.screenshot({ path: join(OUT, name) }));
  console.log("zrzut", name);
};
const page = await pageOf({ width: 2560, height: 1440 }, false);
await page.goto(URL0 + "?tmdemo&demo&t=" + Date.now(), { waitUntil: "domcontentloaded" });
await page.locator("#telemark .tm-cols").waitFor({ timeout: 30000 });
await page.waitForTimeout(1500);
await shot(page, "01-strona.png");
await shot(page, "02-karta.png", "#telemark");
await page.locator("#ranges button[data-d='7']").click();
await page.waitForTimeout(500);
await shot(page, "03-galeria.png", "#fame");
await page.locator("footer.legend").scrollIntoViewIfNeeded();
await shot(page, "04-legenda.png", "footer.legend");
console.log("narty przy nickach:", await page.locator("#telemark .mini svg").count(), "płonące:", await page.locator("#telemark .cup.fire").count());

if (KLATKI) {
  // iskry: klatki co 50 ms wokół pierwszych płonących nart w karcie
  const f = page.locator("#telemark .cup.fire").first();
  await f.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  const b = await f.boundingBox();
  const clip = { x: b.x - 60, y: b.y - 40, width: 200, height: 120 };
  const t0 = Date.now(), times = [];
  for (let i = 0; i < 24; i++) {
    const t = Date.now();
    await page.screenshot({ path: join(OUT, `k${String(i).padStart(2, "0")}.png`), clip });
    times.push(t - t0);
    const wait = 50 - (Date.now() - t);
    if (wait > 0) await page.waitForTimeout(wait);
  }
  console.log("czasy klatek ms:", times.join(","));
}

const phone = await pageOf({ width: 390, height: 844 }, true);
await phone.goto(URL0 + "?tmdemo&demo&t=" + Date.now(), { waitUntil: "domcontentloaded" });
await phone.locator("#telemark .tm-cols").waitFor({ timeout: 30000 });
await phone.waitForTimeout(1000);
await shot(phone, "05-telefon-karta.png", "#telemark");
console.log("telefon: szerokość strony", await phone.evaluate(() => document.documentElement.scrollWidth));
console.log(errors.length ? "BŁĘDY STRONY:\n" + errors.join("\n") : "bez błędów strony");
await browser.close();
