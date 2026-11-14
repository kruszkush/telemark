// Zrzut szkicu (Edge w tle, bez przejmowania myszki): node proto/puchary-telemark/zrzut.mjs <plik.html> <wynik.png> [szer] [wys]
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const [plik, wynik, w = "1920", h = "1080"] = process.argv.slice(2);
const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, colorScheme: "dark" });
await page.goto(pathToFileURL(resolve(plik)).href);
await page.waitForTimeout(300);
await page.screenshot({ path: wynik });
await browser.close();
