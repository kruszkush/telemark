/**
 * Wejście pliku symulacji dla serwera (lotnik/serwer/telemark.js, Node 22): budowanie
 * `vite build -c vite.d2jsp-sim.config.ts`. Serwer bierze stąd skocznie dnia i liczy skoki tym samym kodem co gra.
 */
import { OWN_HILLS } from "../game/hill-choice";

export { dailyHillIds, dayOf, HILL_GROUPS } from "./daily";
export { checkJump, FRAMES_PER_S, MAX_JUMP_FRAMES } from "./jump-check";

/** Wersja gry, z której zbudowano plik (package.json); skok zapisuje ją jako `sim`. */
export const SIM_VERSION: string = import.meta.env.GAME_VERSION;

/** Nazwa i punkt K skoczni do tabel i biletu. */
export function hillInfo(id: string): { id: string; name: string; kPointM: number } | null {
  const hill = OWN_HILLS.find((h) => h.id === id);
  return hill ? { id: hill.id, name: hill.name, kPointM: hill.kPointM } : null;
}
