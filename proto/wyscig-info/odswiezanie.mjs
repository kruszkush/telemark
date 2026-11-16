// Sprawdzenie (Mateusz 16.11): gra na ekranie dnia sama pobiera tabele co minutę. Strona testowa, Edge w tle.
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";
const HASLO = (readFileSync("E:/Vibe coding/lotnik-serwer.env", "utf8").match(/TEST_HASLO=([^\s"\\]+)/) ?? [])[1] ?? "";
const b = await chromium.launch({ channel: "msedge" });
const ctx = await b.newContext({ viewport: { width: 1920, height: 950 } });
await ctx.addInitScript((h) => localStorage.setItem("lotnik.haslo", h), HASLO);
const p = await ctx.newPage();
const t0 = Date.now();
p.on("request", (r) => { if (r.url().includes("/tm/tabele")) console.log("tabele po", ((Date.now() - t0) / 1000).toFixed(1), "s"); });
await p.goto("https://kruszkush.github.io/d2jsp-licznik/test/telemark/index.html?x=" + Date.now());
await p.waitForTimeout(135000);
await p.screenshot({ path: "proto/wyscig-info/odswiezanie.png" });
await b.close();
