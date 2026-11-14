// Próbny skok dnia w przeglądarce (plan docs/plan_d2jsp.md krok 3 i 6): gra z dist-d2jsp na localhost:8801, serwer
// lotnik-test, konto próbne zweryfikowane przez admina testu. Robi zrzuty do podanego folderu.
// Użycie: node scripts/d2jsp-proba.mjs <folder-zrzutów> [grupa 0-2]
// Wcześniej: node node_modules/vite/bin/vite.js build -c vite.d2jsp.config.ts
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import crypto from "node:crypto";
import { chromium } from "@playwright/test";

const OUT = resolve(process.argv[2] ?? "test-results/d2jsp");
const GROUP = Number(process.argv[3] ?? 0);
const LAND = Number(process.argv[4] ?? 0.7);
let K = 0;
const DIST = resolve("dist-d2jsp");
const API = "https://us-east1-rich-chimera-344319.cloudfunctions.net/lotnik-test";
const ENV = readFileSync("E:/Vibe coding/lotnik-serwer.env", "utf8");
const HASLO = (ENV.match(/TEST_HASLO=([^\s"\\]+)/) ?? [])[1] ?? "";
const KONTO_FILE = "E:/Vibe coding/lotnik/out/_tm-konto-testowe.log";
mkdirSync(OUT, { recursive: true });

async function post(path, body) {
  const r = await fetch(API + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost:8801", "X-Lotnik-Haslo": HASLO },
    body: JSON.stringify(body),
  });
  return { status: r.status, j: await r.json() };
}

/** Konto próbne: zapisane w lotnik/out (poza repo), inaczej nowe, zweryfikowane akcją admina testu. */
async function account() {
  if (existsSync(KONTO_FILE)) return JSON.parse(readFileSync(KONTO_FILE, "utf8"));
  const { adminSecret } = await import("../../lotnik/serwer/konta.js");
  const secret = ENV.match(/LOTNIK_SECRET=(\w+)/)[1];
  const nick = "Skoczek" + crypto.randomBytes(2).toString("hex");
  const password = "Tm" + crypto.randomBytes(8).toString("hex");
  const r = await post("/register", { nick, password });
  if (r.status !== 200) throw new Error("rejestracja: " + JSON.stringify(r.j));
  const v = await post("/admin", { secret: adminSecret(secret), action: "verify", nick: r.j.konto.id });
  if (v.status !== 200) throw new Error("weryfikacja: " + JSON.stringify(v.j));
  writeFileSync(KONTO_FILE, JSON.stringify({ nick, password }));
  return { nick, password };
}

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const file = join(DIST, path.endsWith("/") ? path + "index.html" : path);
  if (!file.startsWith(DIST) || !existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" }).end(readFileSync(file));
});
await new Promise((ok) => server.listen(8801, ok));

const konto = await account();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
// Przeglądarka bez okna i tak zamyka prawdziwy kursor komputera w swoim prostokącie, gdy gra przejmuje myszkę
// (Mateusz 14.11: myszka działała tylko w lewym górnym rogu ekranu); jak w e2e/support/fixtures.ts strona odmawia.
await page.addInitScript(() => {
  Element.prototype.requestPointerLock = () =>
    Promise.reject(new DOMException("The mouse is not captured in local tests", "NotSupportedError"));
});
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
const shot = (name) => page.screenshot({ path: join(OUT, name + ".png") });
const log = (...a) => console.log(...a);

await page.goto("http://localhost:8801/");
await page.getByRole("heading", { name: "Skocznie dnia" }).waitFor();
await page.getByText("Hasło testerów").first().waitFor({ timeout: 15000 });
await shot("01-haslo-testerow");
await page.getByLabel("Hasło testerów (strona testowa)").fill(HASLO);
await page.getByRole("button", { name: "Zapisz hasło testerów" }).click();
await page.getByRole("button", { name: "Zaloguj" }).waitFor({ timeout: 15000 });
await page.getByRole("button", { name: "Skacz na próbę" }).first().waitFor();
await shot("02-gosc");
await page.getByLabel("Nick").fill(konto.nick);
await page.getByLabel("Hasło", { exact: true }).fill(konto.password);
await page.getByRole("button", { name: "Zaloguj" }).click();
await page.getByText(`Skaczesz jako ${konto.nick}.`).waitFor({ timeout: 15000 });
await shot("03-zalogowany");

K = Number(/K(\d+)/.exec(await page.locator(".d2-hill h2").nth(GROUP).textContent())[1]);
const jumpButton = page.locator(".d2-hill").nth(GROUP).getByRole("button");
log("przycisk:", await jumpButton.textContent());
await jumpButton.click();
await page.locator("canvas").waitFor();
await page.waitForTimeout(1500);
await shot("04-belka");
// Skok jak w testach autora (e2e/support/jump.ts, jump-timing.ts): gra pod automatem podaje klatkę i odległość do
// progu; oba przyciski 4,5 m przed progiem, prawy 41 klatek po wybiciu, lewy 7 klatek później (czysty telemark).
const STARTED = "Skok rozpoczęty.";
const probeUntil = async (kind, value) =>
  (
    await page.waitForFunction(
      ([k, v, started]) => {
        const said = document.querySelector("p[aria-live]")?.textContent ?? null;
        if (said === null || (said !== "" && said !== started)) return { frame: null };
        const p = window.telemarkJumpProbe;
        if (p === undefined) return false;
        return (k === "edge" ? p.toEdgeM <= v : p.frame >= v) ? { frame: p.frame } : false;
      },
      [kind, value, STARTED],
      { polling: 10, timeout: 60000 },
    )
  ).jsonValue();
const click = async (button) => {
  await page.mouse.down({ button });
  await page.waitForTimeout(60);
  await page.mouse.up({ button });
};
const box = await page.locator("canvas").boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.waitForFunction((t) => document.querySelector("p[aria-live]")?.textContent === t, STARTED, {
  timeout: 20000,
});
await page.mouse.up();
const t0 = Date.now();
const takeoff = (await probeUntil("edge", 4.5)).frame;
if (takeoff !== null) {
  await Promise.all([page.mouse.down({ button: "left" }), page.mouse.down({ button: "right" })]);
  await page.waitForTimeout(60);
  await Promise.all([page.mouse.up({ button: "right" }), page.mouse.up({ button: "left" })]);
  await page.waitForTimeout(400);
  await shot("05-lot");
  // Na większych skoczniach lot jest dłuższy: przygotowanie lądowania dopiero LAND razy K metrów za progiem (w poziomie).
  const landing =
    LAND > 0 ? (await probeUntil("edge", -LAND * K)).frame : (await probeUntil("frame", takeoff + 41)).frame;
  if (landing !== null) {
    await click("right");
    if ((await probeUntil("frame", landing + 7)).frame !== null) await click("left");
  }
}
await page.waitForFunction(
  () => /^(Lądowanie|Upadek)|^Dyskwalifikacja/.test(document.querySelector("p[aria-live]")?.textContent ?? ""),
  null,
  { timeout: 60000 },
);
log("ogłoszenie:", await page.locator("p[aria-live]").textContent());
await page.waitForTimeout(3000);
await shot("06-po-ladowaniu");
log("od startu", ((Date.now() - t0) / 1000).toFixed(1), "s");
// Dalej: lewy przycisk po notach wraca do skoczni dnia.
for (let i = 0; i < 30 && (await page.locator("canvas").count()) > 0; i++) {
  await click("left");
  await page.waitForTimeout(500);
}
await page.getByRole("heading", { name: "Skocznie dnia" }).waitFor({ timeout: 15000 });
await page.locator(".d2-result, .d2-warn").first().waitFor({ timeout: 20000 });
await page.waitForTimeout(2500);
await shot("07-wynik");
const notes = await page.locator("[role=status]").allTextContents();
log("wiadomości:", notes);
log("skocznia:", await page.locator(".d2-hill").nth(GROUP).textContent());
log("błędy strony:", errors.length ? errors : "brak");
await browser.close();
server.close();
