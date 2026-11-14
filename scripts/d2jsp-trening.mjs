// Skocznia treningowa na stronie testowej: zrzuty ekranu dnia zalogowanego (mysz 1650×800, telefon 390×844) i dwa
// skoki treningowe kontem próbnym; sprawdza, że skoki dnia (serwer /tm/dzien) się nie zmieniły i że trening nie
// wysłał nic do /tm/start ani /tm/end. Użycie: node scripts/d2jsp-trening.mjs <folder zrzutów poza test-results>
import { mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";

const OUT = resolve(process.argv[2] ?? "../d2jsp-trening-zrzuty");
const URL = "https://kruszkush.github.io/d2jsp-licznik/test/telemark/";
const ENV = readFileSync("E:/Vibe coding/lotnik-serwer.env", "utf8");
const HASLO = (ENV.match(/TEST_HASLO=([^\s"\\]+)/) ?? [])[1] ?? "";
const konto = JSON.parse(readFileSync("E:/Vibe coding/lotnik/out/_tm-konto-testowe.log", "utf8"));
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const errors = [];
const sent = [];

async function open(name, viewport, mobile) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  await ctx.addInitScript((h) => localStorage.setItem("lotnik.haslo", h), HASLO);
  // Strona odmawia przejęcia myszki (spis sposobów S3: inaczej kursor komputera zostaje zamknięty w oknie testu).
  await ctx.addInitScript(() => {
    Element.prototype.requestPointerLock = () =>
      Promise.reject(new DOMException("The mouse is not captured in local tests", "NotSupportedError"));
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(name + ": " + String(e)));
  page.on("request", (r) => /\/tm\/(start|end)$/.test(r.url()) && sent.push(name + " " + r.url()));
  await page.goto(URL);
  await page.getByRole("heading", { name: "Skocznie dnia" }).waitFor();
  await page.getByRole("button", { name: "Zaloguj" }).waitFor({ timeout: 20000 });
  await page.getByLabel("Nick").fill(konto.nick);
  await page.getByLabel("Hasło", { exact: true }).fill(konto.password);
  await page.getByRole("button", { name: "Zaloguj" }).click();
  await page.getByText(`Skaczesz jako ${konto.nick}.`).waitFor({ timeout: 20000 });
  await page.getByRole("button", { name: "Skacz na treningu" }).waitFor();
  await page.waitForTimeout(2500);
  return { ctx, page };
}

/** Skoki dnia z ekranu: „Skoki: n z 10” przy każdej skoczni. */
const usedLines = (page) => page.locator(".d2-hills .d2-lines li:first-child").allTextContents();
const fits = (page) =>
  page.evaluate(() => ({ scroll: document.scrollingElement.scrollHeight, window: window.innerHeight }));

async function trainingJump(page, n) {
  await page.getByRole("button", { name: "Skacz na treningu" }).click();
  const canvas = page.locator("canvas");
  await canvas.waitFor();
  await page.waitForTimeout(1500);
  if (n === 1) await page.screenshot({ path: join(OUT, "mysz-2-belka-treningu.png") });
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(80);
  await page.mouse.up();
  await page.waitForFunction(() => (window.telemarkJumpProbe?.toEdgeM ?? 99) <= 4.5, null, {
    polling: 10,
    timeout: 60000,
  });
  await Promise.all([page.mouse.down({ button: "left" }), page.mouse.down({ button: "right" })]);
  await page.waitForTimeout(60);
  await Promise.all([page.mouse.up({ button: "right" }), page.mouse.up({ button: "left" })]);
  await page.waitForFunction(
    () => /^(Lądowanie|Upadek)|^Dyskwalifikacja/.test(document.querySelector("p[aria-live]")?.textContent ?? ""),
    null,
    { timeout: 90000 },
  );
  console.log(`skok ${n}:`, await page.locator("p[aria-live]").textContent());
  for (let i = 0; i < 40 && (await page.locator("canvas").count()) > 0; i++) {
    await page.mouse.down();
    await page.waitForTimeout(60);
    await page.mouse.up();
    await page.waitForTimeout(500);
  }
  await page.getByRole("heading", { name: "Skocznie dnia" }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(1500);
  console.log(`  wiadomość:`, await page.locator("[role=status]").allTextContents());
}

const mysz = await open("mysz", { width: 1650, height: 800 }, false);
await mysz.page.screenshot({ path: join(OUT, "mysz-1-dzien.png") });
console.log("mysz mieści się:", await fits(mysz.page));
const before = await usedLines(mysz.page);
console.log("skoki dnia przed:", before);
await trainingJump(mysz.page, 1);
await trainingJump(mysz.page, 2);
await mysz.page.screenshot({ path: join(OUT, "mysz-3-po-treningu.png") });
// Świeży dzień z serwera: odświeżona strona (sesja zostaje na urządzeniu).
await mysz.page.reload();
await mysz.page.getByRole("button", { name: "Skacz na treningu" }).waitFor({ timeout: 20000 });
await mysz.page.waitForTimeout(1500);
const after = await usedLines(mysz.page);
console.log("skoki dnia po (z serwera):", after, JSON.stringify(after) === JSON.stringify(before) ? "BEZ ZMIAN" : "ZMIANA!");
await mysz.ctx.close();

const tel = await open("telefon", { width: 390, height: 844 }, true);
await tel.page.screenshot({ path: join(OUT, "telefon-1-dzien.png") });
console.log("telefon mieści się:", await fits(tel.page));
await tel.ctx.close();

console.log("wysłane do serwera skoki:", sent.length ? sent : "brak");
console.log("błędy:", errors.length ? errors : "brak");
await browser.close();
