// Ekran dnia z rekordami (plan docs/plan_ekran_dnia.md krok 5): strona licznika w oknie 1920×950, przycisk Telemark,
// pomiar w dokumencie gry w okienku (.tm-okno iframe): czy ekran dnia mieści się bez przewijania zalogowanego przed
// i po skoku dnia (z wiadomością po skoku) i gościa; telefon 390×844; makieta obok. Konto próbne z d2jsp-proba.mjs
// (poza repo); skok dnia zużywa 1 z 10 skoków konta próbnego na skoczni z kolejki. Gra nie przejmuje myszki (S3).
// Użycie: node scripts/d2jsp-ekran-dnia.mjs <folder poza test-results> [adres strony] [bez-skoku]
import { mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const OUT = resolve(process.argv[2] ?? "proto/uklad-dnia/zrzuty");
const URL0 = process.argv[3] ?? "https://kruszkush.github.io/d2jsp-licznik/test/";
const JUMP = process.argv[4] !== "bez-skoku";
// Lokalna gra (dist-d2jsp na localhost:8801, wcześniejszy pomiar, krok 4): sama gra w oknie wielkości okienka strony
// przy oknie 1920×950 (szerokość 97%, wysokość okno − 56 px; d2jsp/strona.js .tm-box).
const LOCAL = URL0.startsWith("http://localhost");
const WIDE = LOCAL ? { width: 1862, height: 894 } : { width: 1920, height: 950 };
const API = "https://us-east1-rich-chimera-344319.cloudfunctions.net/lotnik-test";
const ENV = readFileSync("E:/Vibe coding/lotnik-serwer.env", "utf8");
const HASLO = (ENV.match(/TEST_HASLO=([^\s"\\]+)/) ?? [])[1] ?? "";
const { nick, password } = JSON.parse(readFileSync("E:/Vibe coding/lotnik/out/_tm-konto-testowe.log", "utf8"));
const login = await (
  await fetch(API + "/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Lotnik-Haslo": HASLO, Origin: "http://localhost:8801" },
    body: JSON.stringify({ nick, password }),
  })
).json();
if (!login.token) throw new Error("logowanie konta próbnego: " + JSON.stringify(login));
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "msedge" });
const errors = [];
async function pageOf(viewport, mobile, withAccount) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, colorScheme: "dark" });
  await ctx.addInitScript(
    ([h, k]) => {
      try {
        localStorage.setItem("lotnik.haslo", h);
        if (k) localStorage.setItem("lotnik.konto", k);
        else localStorage.removeItem("lotnik.konto");
      } catch {
        /* brak pamięci */
      }
    },
    [HASLO, withAccount ? JSON.stringify({ token: login.token, konto: login.konto }) : null],
  );
  await ctx.addInitScript(() => {
    Element.prototype.requestPointerLock = () =>
      Promise.reject(new DOMException("The mouse is not captured in local tests", "NotSupportedError"));
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  return page;
}

/** Strona licznika, przycisk Telemark, ekran dnia w okienku z tabelą i kartami. */
async function openGame(page) {
  await page.goto(URL0 + "?t=" + Date.now(), { waitUntil: "domcontentloaded" });
  let frame = page.mainFrame();
  if (!LOCAL) {
    await page.locator(".tm-play").first().click();
    frame = await (await page.locator(".tm-okno iframe").elementHandle()).contentFrame();
  }
  await frame.getByRole("heading", { name: "Skocznie dnia" }).waitFor({ timeout: 30000 });
  await frame.locator(".d2-tables").waitFor({ timeout: 20000 });
  await page.waitForTimeout(2000);
  return frame;
}
// Ekran ma najmniej wysokość okienka, więc przewijanie (scrollHeight) nie pokazuje zapasu: liczę też, gdzie kończy
// się zawartość (dół ostatniej części + dolny margines ekranu).
const fits = (frame) =>
  frame.evaluate(() => {
    const main = document.querySelector("main.d2-day");
    const last = main.lastElementChild.getBoundingClientRect().bottom + window.scrollY;
    const tresc = Math.ceil(last + parseFloat(getComputedStyle(main).paddingBottom));
    return { scroll: document.scrollingElement.scrollHeight, tresc, okienko: window.innerHeight };
  });
const report = async (name, frame) => {
  const f = await fits(frame);
  console.log(
    `${name}: zawartość ${f.tresc} px, przewijanie ${f.scroll} px, okienko ${f.okienko} px →`,
    f.scroll <= f.okienko ? `MIEŚCI SIĘ (zapas ${f.okienko - f.tresc} px)` : "PRZEWIJA SIĘ",
  );
  // Części ekranu od góry z wysokością (gdzie szukać miejsca, gdy wystaje).
  const parts = await frame.evaluate(() =>
    [...document.querySelectorAll("main.d2-day > *")].map((e) => `${e.className || e.tagName} ${Math.round(e.getBoundingClientRect().height)}`),
  );
  console.log("  części:", parts.join(" | "));
  return f;
};
const cards = (frame) => frame.locator(".d2-hill").allInnerTexts();

/** Skok dnia na skoczni z kolejki (jak trening w d2jsp-trening.mjs). */
async function dayJump(page, frame) {
  await frame.getByRole("button", { name: /^Skacz \(skok/ }).click();
  const canvas = frame.locator("canvas");
  await canvas.waitFor({ timeout: 30000 });
  await page.waitForTimeout(1500);
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(80);
  await page.mouse.up();
  await frame.waitForFunction(() => (window.telemarkJumpProbe?.toEdgeM ?? 99) <= 4.5, null, { polling: 10, timeout: 60000 });
  await Promise.all([page.mouse.down({ button: "left" }), page.mouse.down({ button: "right" })]);
  await page.waitForTimeout(60);
  await Promise.all([page.mouse.up({ button: "right" }), page.mouse.up({ button: "left" })]);
  await frame.waitForFunction(
    () => /^(Lądowanie|Upadek)|^Dyskwalifikacja/.test(document.querySelector("p[aria-live]")?.textContent ?? ""),
    null,
    { timeout: 90000 },
  );
  console.log("skok:", await frame.locator("p[aria-live]").textContent());
  for (let i = 0; i < 40 && (await frame.locator("canvas").count()) > 0; i++) {
    await page.mouse.down();
    await page.waitForTimeout(60);
    await page.mouse.up();
    await page.waitForTimeout(500);
  }
  await frame.getByRole("heading", { name: "Skocznie dnia" }).waitFor({ timeout: 15000 });
  await frame.locator("[role=status]").first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(2500);
  console.log("wiadomość:", await frame.locator("[role=status]").allTextContents());
}

const results = {};
const mysz = await pageOf(WIDE, false, true);
let frame = await openGame(mysz);
results.przed = await report("zalogowany przed skokiem", frame);
console.log("karty:", JSON.stringify(await cards(frame)));
await mysz.screenshot({ path: join(OUT, "01-zalogowany.png") });
if (JUMP) {
  await dayJump(mysz, frame);
  results.po = await report("zalogowany po skoku", frame);
  console.log("karty po skoku:", JSON.stringify(await cards(frame)));
  await mysz.screenshot({ path: join(OUT, "02-po-skoku.png") });
}

const gosc = await pageOf(WIDE, false, false);
frame = await openGame(gosc);
results.gosc = await report("gość", frame);
await gosc.screenshot({ path: join(OUT, "03-gosc.png") });

const tel = await pageOf({ width: 390, height: 844 }, true, true);
frame = await openGame(tel);
await report("telefon (przewijanie dozwolone)", frame);
await tel.screenshot({ path: join(OUT, "04-telefon.png"), fullPage: false });

const mk = await pageOf({ width: 1920, height: 950 }, false, false);
await mk.goto(pathToFileURL(resolve("proto/uklad-dnia/index.html")).href);
await mk.waitForTimeout(800);
await mk.screenshot({ path: join(OUT, "00-makieta.png") });

console.log("błędy strony:", errors.length ? errors : "brak");
const bad = Object.entries(results).filter(([, f]) => f.scroll > f.okienko);
console.log(bad.length ? "WYNIK: PRZEWIJA SIĘ w: " + bad.map((x) => x[0]).join(", ") : "WYNIK: wszystko mieści się w okienku");
await browser.close();
