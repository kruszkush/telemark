// Podpowiedzi w lewym dolnym rogu i belka bez limitu: skok na próbę z dist-d2jsp (najpierw vite build -c vite.d2jsp.config.ts),
// 20 s czekania na belce, potem najazd i lot; mysz 1650×800 i telefon 844×390. Zrzuty do test-results/d2jsp-podpowiedzi.
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { chromium } from "@playwright/test";

const OUT = resolve("test-results/d2jsp-podpowiedzi");
const DIST = resolve("dist-d2jsp");
const ENV = readFileSync("E:/Vibe coding/lotnik-serwer.env", "utf8");
const HASLO = (ENV.match(/TEST_HASLO=([^\s"\\]+)/) ?? [])[1] ?? "";
const CZEKAJ_MS = Number(process.env.CZEKAJ ?? 20000);
mkdirSync(OUT, { recursive: true });
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const file = join(DIST, path.endsWith("/") ? path + "index.html" : path);
  if (!file.startsWith(DIST) || !existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" }).end(readFileSync(file));
});
await new Promise((ok) => server.listen(8801, ok));
const browser = await chromium.launch();
const errors = [];

async function touch(ctx, page, points, ms) {
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: points });
  await page.waitForTimeout(ms);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

async function run(name, viewport, mobile) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  await ctx.addInitScript((h) => localStorage.setItem("lotnik.haslo", h), HASLO);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(name + ": " + String(e)));
  await page.goto("http://localhost:8801/");
  await page.getByRole("button", { name: "Skacz na próbę" }).first().click({ timeout: 30000 });
  const canvas = page.locator("canvas");
  await canvas.waitFor();
  // Dawniej po 16 s na belce była dyskwalifikacja; teraz skoczek ma czekać.
  await page.waitForTimeout(CZEKAJ_MS);
  await page.screenshot({ path: join(OUT, `${name}-1-belka.png`) });
  const box = await canvas.boundingBox();
  // Na telefonie pola L i P leżą obok obrazu, po jego bokach.
  const cx = mobile ? box.x / 2 : box.x + box.width * 0.25;
  const cy = box.y + box.height / 2;
  const rx = mobile ? (box.x + box.width + viewport.width) / 2 : box.x + box.width * 0.75;
  if (mobile) {
    // Uwaga: samo dotknięcie pola L z tego skryptu nie rusza skoczka (tak samo przed zmianą belki), rusza go
    // dopiero dotknięcie L+P niżej; prawdziwy telefon rusza zwykłym dotknięciem.
    await touch(ctx, page, [{ x: cx, y: cy, id: 3 }], 100);
  } else {
    await page.mouse.move(box.x + box.width / 2, cy);
    await page.mouse.down();
    await page.waitForTimeout(80);
    await page.mouse.up();
  }
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(OUT, `${name}-2-najazd.png`) });
  const edge = await page
    .waitForFunction(() => (window.telemarkJumpProbe?.toEdgeM ?? 99) <= 4.5, null, { polling: 10, timeout: 30000 })
    .then(() => true)
    .catch(() => false);
  if (mobile) {
    // Dwa kciuki naraz: pola L i P.
    await touch(
      ctx,
      page,
      [
        { x: cx, y: cy, id: 1 },
        { x: rx, y: cy, id: 2 },
      ],
      60,
    );
  } else {
    await Promise.all([page.mouse.down({ button: "left" }), page.mouse.down({ button: "right" })]);
    await page.waitForTimeout(60);
    await Promise.all([page.mouse.up({ button: "right" }), page.mouse.up({ button: "left" })]);
  }
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(OUT, `${name}-3-lot.png`) });
  console.log(name, "próg osiągnięty:", edge, "ogłoszenie:", await page.locator("p[aria-live]").textContent());
  await ctx.close();
}

await run("mysz", { width: 1650, height: 800 }, false);
await run("telefon", { width: 844, height: 390 }, true);
console.log("błędy:", errors.length ? errors : "brak");
await browser.close();
server.close();
