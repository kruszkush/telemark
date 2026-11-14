// Próby czcionki wskazówek na belce (Mateusz 14.11: zwykła, łatwa do czytania, mniejsza): skok na próbę z dist-d2jsp,
// na belce zrzut każdej próby (styl dopisany do strony). Mysz 1650×800 i 1920×1080, telefon 844×390.
// Użycie: node scripts/d2jsp-podpowiedzi-proby.mjs <folder>   (wcześniej vite build -c vite.d2jsp.config.ts)
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { chromium } from "@playwright/test";

const OUT = resolve(process.argv[2] ?? "test-results/d2jsp-podpowiedzi-proby");
const DIST = resolve("dist-d2jsp");
const ENV = readFileSync("E:/Vibe coding/lotnik-serwer.env", "utf8");
const HASLO = (ENV.match(/TEST_HASLO=([^\s"\\]+)/) ?? [])[1] ?? "";
mkdirSync(OUT, { recursive: true });
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const file = join(DIST, path.endsWith("/") ? path + "index.html" : path);
  if (!file.startsWith(DIST) || !existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" }).end(readFileSync(file));
});
await new Promise((ok) => server.listen(8801, ok));

const PROBY = {
  // Tło do makiet: belka bez wskazówek.
  "0-bez": ".page-hints{display:none}",
  "1-zwykla": "/* bez zmian */",
  "2-mniejsza": ".page-hints{font-size:max(12px,calc(var(--picture-px) * 4))}",
  "3-na-tle": ".page-hints{background:rgb(0 0 0 / 55%);padding:0.2em 0.5em;text-shadow:none;font-weight:400}",
};
const browser = await chromium.launch();
const errors = [];
async function run(name, viewport, mobile) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  await ctx.addInitScript((h) => localStorage.setItem("lotnik.haslo", h), HASLO);
  // Strona odmawia przejęcia myszki (spis sposobów S3): inaczej kursor Mateusza zostaje zamknięty w rogu ekranu.
  await ctx.addInitScript(() => {
    Element.prototype.requestPointerLock = () =>
      Promise.reject(new DOMException("The mouse is not captured in local tests", "NotSupportedError"));
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(name + ": " + String(e)));
  await page.goto("http://localhost:8801/");
  await page.getByRole("button", { name: "Skacz na próbę" }).first().click({ timeout: 30000 });
  await page.locator(".page-hints div").first().waitFor({ timeout: 10000 });
  // Telefon pyta najpierw o przechylanie; „Nie, palcem” i powrót do gry.
  const palcem = page.getByRole("button", { name: /palcem/i });
  if (await palcem.isVisible().catch(() => false)) await palcem.click();
  const wroc = page.getByRole("button", { name: /wróć do gry/i });
  if (await wroc.isVisible().catch(() => false)) await wroc.click();
  await page.waitForTimeout(1500);
  for (const [proba, css] of Object.entries(PROBY)) {
    const tag = await page.addStyleTag({ content: css });
    await page.waitForTimeout(100);
    await page.screenshot({ path: join(OUT, `${name}-${proba}.png`) });
    await tag.evaluate((t) => t.remove());
  }
  console.log(name, "linie:", await page.locator(".page-hints div").allTextContents());
  await ctx.close();
}
await run("mysz", { width: 1650, height: 800 }, false);
await run("fullhd", { width: 1920, height: 1080 }, false);
await run("telefon", { width: 844, height: 390 }, true);
console.log("błędy:", errors.length ? errors : "brak");
await browser.close();
server.close();
