import { defineConfig, devices } from "@playwright/test";

/** Porównanie pliku symulacji serwera d2jsp w silnikach przeglądarek (e2e/d2jsp-sim.spec.ts), bez budowania gry. */
export default defineConfig({
  testDir: "e2e",
  testMatch: "d2jsp-sim.spec.ts",
  timeout: 120_000,
  reporter: "list",
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "iphone-webkit", use: { ...devices["iPhone 15"] } },
  ],
});
