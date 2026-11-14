// Zrzuty karty Telemarka na stronie licznika (plan docs/plan_strona_mistrzowie.md): Edge w tle, 2560×1440, ciemny
// wygląd jak makieta C; strona z prawdziwymi danymi i z ?tmdemo (przykładowe dane), makieta obok; telefon 390×844.
// Klik ▶ i klik w nick otwierają grę (oglądanie skoku, „Skoki gracza”). Gra nie przejmuje myszki (spis sposobów S3).
// Użycie: node scripts/d2jsp-mistrzowie-zrzuty.mjs <folder poza test-results> [adres strony]
import { mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const OUT = resolve(process.argv[2] ?? "proto/strona-mistrzowie/zrzuty");
const URL0 = process.argv[3] ?? "https://kruszkush.github.io/d2jsp-licznik/test/";
const ENV = readFileSync("E:/Vibe coding/lotnik-serwer.env", "utf8");
const HASLO = (ENV.match(/TEST_HASLO=([^\s"\\]+)/) ?? [])[1] ?? "";
// Konto próbne (z d2jsp-proba.mjs, poza repo) zalogowane na serwerze testowym: wiersz „Ty: … miejsce” na karcie.
const KONTO = await (async () => {
  try {
    const { nick, password } = JSON.parse(readFileSync("E:/Vibe coding/lotnik/out/_tm-konto-testowe.log", "utf8"));
    const r = await fetch("https://us-east1-rich-chimera-344319.cloudfunctions.net/lotnik-test/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Lotnik-Haslo": HASLO, Origin: "http://localhost:8801" },
      body: JSON.stringify({ nick, password }),
    });
    const j = await r.json();
    return j.token ? j : null;
  } catch {
    return null;
  }
})();
console.log("konto próbne:", KONTO ? KONTO.konto.nick : "brak");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "msedge" });
const errors = [];
async function pageOf(viewport, mobile, login) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, colorScheme: "dark" });
  await ctx.addInitScript(
    ([h, k]) => {
      try {
        localStorage.setItem("lotnik.haslo", h);
        if (k) localStorage.setItem("lotnik.konto", k);
      } catch {
        /* brak pamięci */
      }
    },
    [HASLO, login && KONTO ? JSON.stringify({ token: KONTO.token, konto: KONTO.konto }) : null],
  );
  await ctx.addInitScript(() => {
    Element.prototype.requestPointerLock = () =>
      Promise.reject(new DOMException("The mouse is not captured in local tests", "NotSupportedError"));
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  return page;
}
const shot = async (page, name, el) => {
  await (el ? page.locator(el).screenshot({ path: join(OUT, name) }) : page.screenshot({ path: join(OUT, name) }));
  console.log("zrzut", name);
};

const page = await pageOf({ width: 2560, height: 1440 }, false, true);
const ready = () => page.locator("#telemark .tm-cols, #telemark .tm-err").first().waitFor({ timeout: 30000 });
for (const [q, n] of [
  ["", "01"],
  ["tmdemo&", "02"],
]) {
  await page.goto(URL0 + "?" + q + "t=" + Date.now(), { waitUntil: "domcontentloaded" });
  await ready();
  await page.waitForTimeout(1500);
  await shot(page, `${n}-strona.png`);
  await shot(page, `${n}-karta.png`, "#telemark");
}
console.log("karta:", (await page.locator("#telemark").innerText()).slice(0, 700));
await page.locator("#ranges button[data-d='1']").click();
console.log("24 h: wykres widoczny?", await page.locator("#chartCard").isVisible());
await page.locator("#ranges button[data-d='7']").click();
console.log("7 dni: wykres widoczny?", await page.locator("#chartCard").isVisible());
await shot(page, "03-galeria.png", "aside");

const mk = await pageOf({ width: 2560, height: 1440 }, false, false);
await mk.goto(pathToFileURL(resolve("proto/strona-mistrzowie/makieta-c.html")).href);
await shot(mk, "00-makieta.png");
await shot(mk, "00-makieta-karta.png", ".card.tm");

// Prawdziwe dane: ▶ (dzisiejszy wyszarzony) i klik w nick otwiera „Skoki gracza”.
await page.goto(URL0 + "?t=" + Date.now(), { waitUntil: "domcontentloaded" });
await ready();
const plays = page.locator("#telemark .pl");
console.log("▶ na karcie:", await plays.count(), "wyszarzone:", await page.locator("#telemark .pl[disabled]").count());
const nick = page.locator("#telemark .tmr.kw .nk").first();
if (await nick.count()) {
  console.log("klik w nick:", await nick.textContent());
  await nick.click();
  const game = page.frameLocator(".tm-okno iframe");
  await game.getByRole("heading", { name: /Skoki gracza/ }).waitFor({ timeout: 30000 });
  await page.waitForTimeout(2500);
  await shot(page, "04-skoki-gracza.png");
  await game.locator(".d2-pday").last().click().catch(() => undefined);
  await page.waitForTimeout(1500);
  await shot(page, "05-skoki-dnia.png");
}

const phone = await pageOf({ width: 390, height: 844 }, true, false);
await phone.goto(URL0 + "?tmdemo&t=" + Date.now(), { waitUntil: "domcontentloaded" });
await phone.locator("#telemark .tm-cols").waitFor({ timeout: 30000 });
await phone.waitForTimeout(1000);
await shot(phone, "06-telefon-karta.png", "#telemark");
console.log("telefon: szerokość strony", await phone.evaluate(() => document.documentElement.scrollWidth));

console.log(errors.length ? "BŁĘDY STRONY:\n" + errors.join("\n") : "bez błędów strony");
await browser.close();
