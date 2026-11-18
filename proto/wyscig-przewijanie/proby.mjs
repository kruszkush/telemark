// Próby paska przewijania w wyścigach (Mateusz 18.11: „ładniejszy… połowę chudszy”; wzoru brak, wygląd wymyślony).
// Strona główna z lokalnym d2jsp/strona.js i dopisanym CSS próby; zrzut wyścigów przewiniętych do połowy, jasny i ciemny
// motyw, szerokość paska zmierzona. Użycie (z folderu telemark): node proto/wyscig-przewijanie/proby.mjs <folder>
import { chromium } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";

const out = process.argv[2] || "proto/wyscig-przewijanie/proby";
mkdirSync(out, { recursive: true });
const local = readFileSync("d2jsp/strona.js", "utf8");
const U = "#telemark .tmr ul";
// Chromium od wersji 121 pomija ::-webkit-scrollbar, gdy ustawione jest scrollbar-width, więc w próbach go zdejmuję.
const WK = (w, thumb, track, hover) =>
  `${U}{scrollbar-width:auto}${U}::-webkit-scrollbar{width:${w}px}${U}::-webkit-scrollbar-track{background:${track};border-radius:${w}px}` +
  `${U}::-webkit-scrollbar-thumb{background:${thumb};border-radius:${w}px}${U}::-webkit-scrollbar-thumb:hover{background:${hover}}`;
const PROBY = {
  "0 obecny": "",
  "A szary 5 px": WK(5, "color-mix(in srgb,var(--mute) 45%,transparent)", "transparent", "var(--mute)"),
  "B kolor wyscigu 5 px": WK(5, "color-mix(in srgb,var(--c) 70%,transparent)", "color-mix(in srgb,var(--line) 60%,transparent)", "var(--c)"),
  "C kolor wyscigu 4 px bez toru": WK(4, "var(--c)", "transparent", "var(--c)"),
};
const browser = await chromium.launch({ channel: "msedge", ignoreDefaultArgs: ["--hide-scrollbars"] });
for (const scheme of ["light", "dark"]) {
  const page = await browser.newPage({ viewport: { width: 2560, height: 1440 }, colorScheme: scheme });
  await page.route(/telemark\/strona\.js/, (r) => r.fulfill({ body: local, contentType: "text/javascript" }));
  await page.goto("https://kruszkush.github.io/d2jsp-licznik/?t=" + Date.now(), { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator("#telemark .tmr li").first().waitFor({ timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.locator("#telemark .tm-races").scrollIntoViewIfNeeded();
  let i = 0;
  for (const [name, css] of Object.entries(PROBY)) {
    await page.evaluate((c) => {
      let s = document.getElementById("proba");
      if (!s) { s = document.createElement("style"); s.id = "proba"; document.head.appendChild(s); }
      s.textContent = c;
      document.querySelectorAll("#telemark .tmr ul").forEach((u) => { u.style.display = "none"; void u.offsetHeight; u.style.display = ""; u.scrollTop = 60; });
    }, css);
    await page.waitForTimeout(300);
    const w = await page.$eval(U, (u) => u.offsetWidth - u.clientWidth);
    console.log(`${scheme} ${name}: pasek ${w} px`);
    await page.locator("#telemark .tm-races").screenshot({ path: `${out}/${scheme}-${i++}.png` });
  }
  await page.close();
}
await browser.close();
