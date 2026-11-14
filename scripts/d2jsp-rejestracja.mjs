// Rejestracja i weryfikacja konta w grze (Mateusz 14.11): gra z dist-d2jsp na localhost:8801, serwer lotnik-test.
// Zakłada nowe konto formularzem gry, robi zrzuty ramki z kodem, klika kod i „Zweryfikuj”, potem weryfikuje konto
// akcją admina testu (jak prawdziwy licznik po poście z kodem) i robi zrzut potwierdzenia.
// Użycie: node scripts/d2jsp-rejestracja.mjs <folder-zrzutów>   (wcześniej build: vite build -c vite.d2jsp.config.ts)
import { createServer } from "node:http";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import crypto from "node:crypto";
import { chromium } from "@playwright/test";
import { adminSecret } from "../../lotnik/serwer/konta.js";

const OUT = resolve(process.argv[2] ?? "test-results/d2jsp-rejestracja");
const DIST = resolve("dist-d2jsp");
const API = "https://us-east1-rich-chimera-344319.cloudfunctions.net/lotnik-test";
const ENV = readFileSync("E:/Vibe coding/lotnik-serwer.env", "utf8");
const HASLO = (ENV.match(/TEST_HASLO=([^\s"\\]+)/) ?? [])[1] ?? "";
const SECRET = ENV.match(/LOTNIK_SECRET=(\w+)/)[1];
// Konta próbne zakładane przez ten skrypt: zapis poza repo, żeby dało się je znaleźć i usunąć.
const LOG = "E:/Vibe coding/lotnik/out/_tm-konta-rejestracja.log";
mkdirSync(OUT, { recursive: true });

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const file = join(DIST, path.endsWith("/") ? path + "index.html" : path);
  if (!file.startsWith(DIST) || !existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" }).end(readFileSync(file));
});
await new Promise((ok) => server.listen(8801, ok));

const nick = "Rejestr" + crypto.randomBytes(2).toString("hex");
const password = "Tm" + crypto.randomBytes(8).toString("hex");
appendFileSync(LOG, JSON.stringify({ nick, password, kiedy: new Date().toISOString() }) + "\n");

const browser = await chromium.launch();
const errors = [];
async function run(name, viewport, mobile) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  await ctx.addInitScript((h) => localStorage.setItem("lotnik.haslo", h), HASLO);
  // Strona odmawia przejęcia myszki (spis sposobów S3, jak d2jsp-podpowiedzi-zrzuty.mjs): inaczej kursor Mateusza
  // zostaje zamknięty w rogu ekranu.
  await ctx.addInitScript(() => {
    Element.prototype.requestPointerLock = () =>
      Promise.reject(new DOMException("The mouse is not captured in local tests", "NotSupportedError"));
  });
  // Temat forum z „Zweryfikuj” otwiera się w nowej karcie; tu wystarczy wiedzieć, że się otworzył.
  const opened = [];
  const page = await ctx.newPage();
  ctx.on("page", (p) => {
    void p
      .waitForURL(/./, { timeout: 5000 })
      .catch(() => {})
      .then(() => {
        opened.push(p.url());
        return p.close();
      });
  });
  page.on("pageerror", (e) => errors.push(name + ": " + String(e)));
  await page.goto("http://localhost:8801/");
  await page.getByRole("button", { name: "Załóż konto" }).waitFor({ timeout: 30000 });
  await page.screenshot({ path: join(OUT, `${name}-1-formularz.png`), fullPage: true });
  return { ctx, page, opened };
}

// Mysz: zakłada konto i przechodzi całą drogę.
const m = await run("mysz", { width: 1920, height: 1080 }, false);
await m.page.getByLabel("Nick").fill(nick);
await m.page.getByLabel("Hasło", { exact: true }).fill(password);
await m.page.getByRole("button", { name: "Załóż konto" }).click();
await m.page.getByText("Konto niezweryfikowane").waitFor({ timeout: 20000 });
await m.page.screenshot({ path: join(OUT, "mysz-2-niezweryfikowane.png"), fullPage: true });
const kod = (await m.page.locator(".d2-verify-code").textContent()) ?? "";
console.log("kod w ramce:", kod);
await m.page.getByRole("button", { name: "Zweryfikuj" }).click();
await m.page.getByText("Weryfikacja w toku").waitFor({ timeout: 5000 });
await m.page.waitForTimeout(500);
console.log("otwarte karty:", m.opened);
console.log(
  "komunikat:",
  await m.page
    .locator(".d2-verify [role=status]")
    .textContent()
    .catch(() => "brak"),
);
await m.page.screenshot({ path: join(OUT, "mysz-3-w-toku.png"), fullPage: true });
await m.page.reload();
await m.page.getByText("Weryfikacja w toku").waitFor({ timeout: 20000 });
console.log("po odświeżeniu: dalej w toku");

// Weryfikacja jak po poście z kodem (akcja admina testu, po id konta jak w d2jsp-proba.mjs), potem odświeżenie.
const id = await m.page.evaluate(() => JSON.parse(localStorage.getItem("lotnik.konto") ?? "{}").konto?.id);
const v = await fetch(API + "/admin", {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: "http://localhost:8801", "X-Lotnik-Haslo": HASLO },
  body: JSON.stringify({ secret: adminSecret(SECRET), action: "verify", nick: id }),
});
console.log("weryfikacja admina:", v.status);
await m.page.reload();
await m.page.getByText("Konto zweryfikowane").waitFor({ timeout: 20000 });
await m.page.screenshot({ path: join(OUT, "mysz-4-zweryfikowane.png"), fullPage: true });
await m.page.reload();
await m.page.getByRole("heading", { name: "Skocznie dnia" }).waitFor();
await m.page.waitForTimeout(3000);
console.log("potwierdzenie po 2. odświeżeniu:", await m.page.getByText("Konto zweryfikowane").count());

// Kod od admina (jak scripts/lotnik-admin.mjs code): wylogowanie, „Mam kod od admina”, nowe hasło, potem logowanie nim.
const c = await fetch(API + "/admin", {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: "http://localhost:8801", "X-Lotnik-Haslo": HASLO },
  body: JSON.stringify({ secret: adminSecret(SECRET), action: "code", nick: id }),
});
const kodAdmina = (await c.json()).kod;
console.log("kod od admina:", c.status, kodAdmina ? "jest" : "brak");
const nowe = "Nw" + crypto.randomBytes(8).toString("hex");
appendFileSync(
  LOG,
  JSON.stringify({ nick, password: nowe, kiedy: new Date().toISOString(), po: "kod od admina" }) + "\n",
);
await m.page.getByRole("button", { name: "Wyloguj" }).click();
await m.page.getByRole("button", { name: "Mam kod od admina" }).click();
await m.page.getByLabel("Nick").fill(nick);
await m.page.getByLabel("Kod od admina").fill(kodAdmina);
await m.page.getByLabel("Nowe hasło").fill(nowe);
await m.page.screenshot({ path: join(OUT, "mysz-5-kod-od-admina.png"), fullPage: true });
await m.page.getByRole("button", { name: "Ustaw hasło" }).click();
await m.page.getByText(`Skaczesz jako ${nick}.`).waitFor({ timeout: 20000 });
await m.page.screenshot({ path: join(OUT, "mysz-6-po-kodzie.png"), fullPage: true });
console.log("po kodzie zalogowany:", nick);
// Stare hasło już nie działa, nowe tak (to samo konto Lotnika).
const sprawdz = async (haslo) =>
  (
    await fetch(API + "/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:8801", "X-Lotnik-Haslo": HASLO },
      body: JSON.stringify({ nick, password: haslo }),
    })
  ).status;
console.log("logowanie starym hasłem:", await sprawdz(password), "nowym:", await sprawdz(nowe));
// Zły kod: komunikat w formularzu.
await m.page.getByRole("button", { name: "Wyloguj" }).click();
await m.page.getByRole("button", { name: "Mam kod od admina" }).click();
await m.page.getByLabel("Nick").fill(nick);
await m.page.getByLabel("Kod od admina").fill("AAAA-AAAA");
await m.page.getByLabel("Nowe hasło").fill(nowe);
await m.page.getByRole("button", { name: "Ustaw hasło" }).click();
await m.page.getByRole("alert").waitFor({ timeout: 20000 });
console.log("zły kod, komunikat:", await m.page.getByRole("alert").textContent());
await m.page.screenshot({ path: join(OUT, "mysz-7-zly-kod.png"), fullPage: true });
await m.ctx.close();

// Telefon: sam formularz (bez nowego konta).
const t = await run("telefon", { width: 390, height: 844 }, true);
await t.ctx.close();
console.log("błędy:", errors.length ? errors : "brak");
await browser.close();
server.close();
