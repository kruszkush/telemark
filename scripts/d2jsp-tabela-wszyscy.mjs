// Tabela w grze z wszystkimi graczami (Mateusz 25.11, okienko z przewijaniem): lokalna gra (dist-d2jsp, localhost:8801)
// z serwerem lotnik-test, odpowiedź /tm/tabele uzupełniona o sztucznych graczy (3, 8, 30). Mierzy, czy ekran dnia
// mieści się w okienku gry przy oknie 1920×950 (1862×894) zalogowanego i gościa, czy wiersz konta próbnego jest
// widoczny w okienku tabeli, i robi zrzuty (też telefon 390×844). Konto próbne poza repo (d2jsp-proba.mjs).
// Użycie: node node_modules/vite/bin/vite.js build -c vite.d2jsp.config.ts; node scripts/d2jsp-tabela-wszyscy.mjs <folder>
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { chromium } from "@playwright/test";

const OUT = resolve(process.argv[2] ?? "../d2jsp-tabela-wszyscy");
const DIST = resolve("dist-d2jsp");
const API =
  "https://us-east1-rich-chimera-344319.cloudfunctions.net/lotnik-test";
const ENV = readFileSync("E:/Vibe coding/lotnik-serwer.env", "utf8");
const HASLO = (ENV.match(/TEST_HASLO=([^\s"\\]+)/) ?? [])[1] ?? "";
const { nick, password } = JSON.parse(
  readFileSync("E:/Vibe coding/lotnik/out/_tm-konto-testowe.log", "utf8"),
);
mkdirSync(OUT, { recursive: true });
const login = await (
  await fetch(API + "/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Lotnik-Haslo": HASLO,
      Origin: "http://localhost:8801",
    },
    body: JSON.stringify({ nick, password }),
  })
).json();
if (!login.token)
  throw new Error("logowanie konta próbnego: " + JSON.stringify(login));

const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".woff2": "font/woff2",
};
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const file = join(DIST, path.endsWith("/") ? path + "index.html" : path);
  if (!file.startsWith(DIST) || !existsSync(file))
    return res.writeHead(404).end();
  res
    .writeHead(200, {
      "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
    })
    .end(readFileSync(file));
});
await new Promise((ok) => server.listen(8801, ok));

/** Sztuczni gracze dopisani do prawdziwej odpowiedzi; konto próbne staje w środku listy (miejsce `at`). */
function fill(j, n, at) {
  const fake = (i) => ({
    nick: "Gracz" + String(i + 1).padStart(2, "0"),
    uid: null,
  });
  const dzis = (j.dzis ?? []).filter((r) => r.nick !== nick);
  const mineD = (j.dzis ?? []).find((r) => r.nick === nick);
  const rows = Array.from({ length: n }, (_, i) => ({
    ...fake(i),
    sumy: [200 - i, 150, 300],
    uzyte: [2, 2, 2],
    skoki: 6,
    wynik: 650 - i * 3,
  }));
  if (mineD) rows.splice(Math.min(at, rows.length), 0, { ...mineD, wynik: 0 });
  j.dzis = [...rows, ...dzis]
    .slice(0, Math.max(n + 1, 1))
    .map((r, i) => ({ ...r, place: i + 1 }));
  for (const p of j.okresy ?? []) {
    if (p.k !== "w") continue;
    const mineW = p.rows.find((r) => r.nick === nick);
    const w = Array.from({ length: n }, (_, i) => ({
      ...fake(i),
      dni: 3,
      suma: 1900 - i * 7,
      puchary: [],
    }));
    if (mineW) w.splice(Math.min(at, w.length), 0, mineW);
    p.rows = w.map((r, i) => ({ ...r, place: i + 1 }));
  }
  return j;
}

const browser = await chromium.launch({ channel: "msedge" });
const errors = [];
async function open(name, viewport, mobile, withAccount, n, tab) {
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile: mobile,
    hasTouch: mobile,
    colorScheme: "dark",
  });
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
    [
      HASLO,
      withAccount
        ? JSON.stringify({ token: login.token, konto: login.konto })
        : null,
    ],
  );
  await ctx.route("**/tm/tabele", async (route) => {
    const r = await route.fetch();
    route.fulfill({
      response: r,
      json: fill(await r.json(), n, Math.round(n * 0.7)),
    });
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("http://localhost:8801/?t=" + Date.now());
  await page.locator(".d2-table-box").waitFor({ timeout: 30000 });
  if (tab === "w") await page.locator(".d2-tab").nth(1).click();
  await page.waitForTimeout(1500);
  const m = await page.evaluate((me) => {
    const main = document.querySelector("main.d2-day");
    const last =
      main.lastElementChild.getBoundingClientRect().bottom + window.scrollY;
    const box = document.querySelector(".d2-table-box");
    const b = box.getBoundingClientRect();
    const head = box.querySelector("thead").getBoundingClientRect();
    const row = [...box.querySelectorAll("tbody tr")].find((t) =>
      t.textContent.includes(me),
    );
    const r = row?.getBoundingClientRect();
    return {
      tresc: Math.ceil(last + parseFloat(getComputedStyle(main).paddingBottom)),
      okienko: window.innerHeight,
      wiersze: box.querySelectorAll("tbody tr").length,
      okienkoTabeli: Math.round(b.height),
      przewija: box.scrollHeight > box.clientHeight,
      wierszGracza: r
        ? r.top >= head.bottom - 1 && r.bottom <= b.bottom + 1
          ? "widoczny"
          : "ukryty"
        : "brak",
      wBok: document.scrollingElement.scrollWidth - window.innerWidth,
      wysokoscWiersza: Math.round(
        box.querySelector("tbody tr")?.getBoundingClientRect().height ?? 0,
      ),
    };
  }, nick);
  // Gość nie ma swojego wiersza (konto próbne jest w danych, ale gra go nie wyróżnia ani nie szuka).
  if (!withAccount) m.wierszGracza = "nie dotyczy";
  await page.screenshot({ path: join(OUT, name + ".png") });
  // Ekran ma się mieścić bez przewijania tylko w oknie gry na komputerze 1920×950; w bok nigdzie.
  const ok =
    (mobile || viewport.width < 1800 || m.tresc <= m.okienko) && m.wBok <= 0;
  console.log(
    `${name}: ${m.wiersze} wierszy, okienko tabeli ${m.okienkoTabeli} px (wiersz ${m.wysokoscWiersza} px), ${m.przewija ? "przewija się" : "bez przewijania"}, gracz ${m.wierszGracza}; ekran ${m.tresc}/${m.okienko} px ${mobile || viewport.width < 1800 ? "(przewijanie strony dozwolone)" : m.tresc <= m.okienko ? "MIEŚCI SIĘ" : "NIE MIEŚCI SIĘ"}, w bok ${m.wBok > 0 ? m.wBok + " px ZA SZEROKO" : "nic"}`,
  );
  await ctx.close();
  return ok && m.wierszGracza !== "ukryty";
}

const WIDE = { width: 1862, height: 894 };
let all = true;
for (const n of [3, 8, 30]) {
  all = (await open(`zalogowany-dzis-${n}`, WIDE, false, true, n, "d")) && all;
  all =
    (await open(`zalogowany-tydzien-${n}`, WIDE, false, true, n, "w")) && all;
  all = (await open(`gosc-dzis-${n}`, WIDE, false, false, n, "d")) && all;
}
all =
  (await open(
    "telefon-dzis-30",
    { width: 390, height: 844 },
    true,
    true,
    30,
    "d",
  )) && all;
// Telefon poziomo (tabela obok kart, po prawej) i średnie okna.
for (const [name, vp, mobile] of [
  ["telefon-poziomo-30", { width: 851, height: 393 }, true],
  ["okno-800x600-30", { width: 800, height: 600 }, false],
  ["okno-1280x720-30", { width: 1280, height: 720 }, false],
  ["okno-600x900-30", { width: 600, height: 900 }, false],
])
  all = (await open(name, vp, mobile, true, 30, "d")) && all;
console.log("błędy strony:", errors.length ? errors : "brak");
console.log(all ? "WYNIK: mieści się, gracz widoczny" : "WYNIK: FAIL");
await browser.close();
server.close();
