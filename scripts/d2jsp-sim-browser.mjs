// Krok 1 docs/plan_d2jsp.md: plik symulacji serwera w prawdziwej przeglądarce z systemu (gdy Playwright nie może
// uruchomić swojej). Serwer lokalny podaje plik i zestaw skoków, strona liczy skoki i odsyła wyniki, skrypt porównuje.
//   node scripts/d2jsp-sim-browser.mjs "<ścieżka do przeglądarki>" [flagi przeglądarki…]
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [browser, ...flags] = process.argv.slice(2);
const sim = readFileSync("dist-d2jsp-sim/" + readdirSync("dist-d2jsp-sim").find((f) => f.endsWith(".mjs")), "utf8");
const set = readFileSync("src/d2jsp/test-support/jump-set.json", "utf8");
const page = `<!doctype html><meta charset="utf-8"><title>sim</title><script type="module">
const sim = await import('/sim.mjs');
const set = await (await fetch('/set.json')).json();
const got = set.map((j) => sim.checkJump(j.hillId, j.seed, j.inputs));
await fetch('/wynik', { method: 'POST', body: JSON.stringify({ ua: navigator.userAgent, got }) });
document.body.textContent = 'gotowe';
</script>`;
const profile = mkdtempSync(join(tmpdir(), "d2jsp-sim-"));
let child;
const server = createServer((req, res) => {
  if (req.url === "/sim.mjs") return res.writeHead(200, { "Content-Type": "text/javascript" }).end(sim);
  if (req.url === "/set.json") return res.writeHead(200, { "Content-Type": "application/json" }).end(set);
  if (req.url === "/wynik") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      res.end("ok");
      const { ua, got } = JSON.parse(body);
      const want = JSON.parse(set).map((j) => j.atTouchdown);
      const bad = got.filter((g, i) => JSON.stringify(g) !== JSON.stringify(want[i])).length;
      console.log(`${ua}: ${got.length - bad}/${got.length} zgodnych`);
      child.kill();
      server.close();
      setTimeout(() => rmSync(profile, { recursive: true, force: true }), 1500);
      process.exitCode = bad ? 1 : 0;
    });
    return;
  }
  res.writeHead(200, { "Content-Type": "text/html" }).end(page);
});
server.listen(8897, () => {
  child = spawn(browser, [...flags.map((f) => f.replace("{profile}", profile)), "http://127.0.0.1:8897/"], {
    stdio: "ignore",
  });
});
setTimeout(() => {
  console.log("brak wyniku po 90 s");
  child?.kill();
  server.close();
  process.exitCode = 2;
}, 90_000).unref();
