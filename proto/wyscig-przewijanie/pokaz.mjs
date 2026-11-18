// Pokaz Mateuszowi: strona główna licznika w oknie Brave z lokalnym d2jsp/strona.js (nic nie publikuje).
// Użycie (z folderu telemark): node proto/wyscig-przewijanie/pokaz.mjs [adres]
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const url = process.argv[2] || "https://kruszkush.github.io/d2jsp-licznik/";
const local = readFileSync("d2jsp/strona.js", "utf8");
const browser = await chromium.launch({
  headless: false,
  executablePath: "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
  args: ["--start-maximized"],
});
const page = await browser.newPage({ viewport: null });
await page.route(/telemark\/strona\.js/, (r) => r.fulfill({ body: local, contentType: "text/javascript" }));
await page.goto(url + "?t=" + Date.now(), { waitUntil: "domcontentloaded", timeout: 60000 });
await page.locator("#telemark .tm-races").waitFor({ timeout: 60000 });
await page.locator("#telemark .tm-races").scrollIntoViewIfNeeded();
await new Promise((r) => browser.on("disconnected", r));
