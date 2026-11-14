/**
 * Rozmowa gry z serwerem Lotnika (trasy /tm/* i konta, lotnik/serwer/telemark.js) na stronie licznika d2jsp. Konto i
 * hasło testerów są wspólne z Lotnikiem: ta sama domena, te same klucze localStorage (lotnik/konto.js, nakladka.js;
 * prod z przedrostkiem „p.”). Skok wysłany w chwili lądowania czeka w kolejce, dopóki serwer go nie przyjmie.
 */

import { D2_TEXT } from "../text/d2jsp-text";

const PROD_PAGE = location.hostname === "kruszkush.github.io" && !location.pathname.includes("/test/");
export const SERVER_TEST = !PROD_PAGE;
const API = "https://us-east1-rich-chimera-344319.cloudfunctions.net/" + (SERVER_TEST ? "lotnik-test" : "lotnik");
const PREFIX = SERVER_TEST ? "" : "p.";
const ACCOUNT_KEY = PREFIX + "lotnik.konto";
const PASSWORD_KEY = "lotnik.haslo";
const PENDING_KEY = PREFIX + "telemark.doWyslania";
/** Serwer przyjmuje skok do 10 minut od biletu. */
const PENDING_MS = 10 * 60 * 1000;

export interface Konto {
  id: string;
  nick: string;
  verified: boolean;
  uid: string | null;
}
export interface Session {
  token: string;
  konto: Konto;
}
export interface Reply<T> {
  ok: boolean;
  status: number;
  j: T & { error?: string; haslo?: boolean; relogin?: boolean; gosc?: string | boolean };
}
export interface HillInfo {
  id: string;
  name: string;
  kPointM: number;
}
export interface JumpScore {
  p: number;
  gid: string;
  m: number;
  fell?: boolean;
}
export interface DayState {
  day: string;
  hills: HillInfo[];
  limit: number;
  sim: string;
  konto: { nick: string; verified: boolean } | null;
  /** Powód, dla którego gracz skacze jak gość; brak u zalogowanego, zweryfikowanego. */
  gosc?: string;
  uzyte?: number[];
  najlepsze?: JumpScore[][];
  sumy?: number[];
  wynik?: number;
}
export interface Ticket {
  bilet: string;
  gid: string;
  day: string;
  grupa: number;
  hill: HillInfo;
  n: number;
  seed: number;
}
export interface SavedJump {
  gid: string;
  n: number;
  m: number;
  p: number;
  fell: boolean;
  grupa: number;
  uzyte: number[];
  sumy: number[];
  wynik: number;
  najlepsze: JumpScore[][];
  miejsce: number;
  z: number;
}

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string | null): void => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // tryb prywatny: tylko do zamknięcia strony
  }
};

export function session(): Session | null {
  try {
    const d: unknown = JSON.parse(read(ACCOUNT_KEY) ?? "null");
    if (typeof d !== "object" || d === null || !("token" in d) || !("konto" in d)) return null;
    const { token, konto } = d;
    if (typeof token !== "string" || typeof konto !== "object" || konto === null || !("nick" in konto)) return null;
    if (typeof konto.nick !== "string") return null;
    // Zapis Lotnika (konto.js): konto z serwera, sprawdzone pole, którego gra używa.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    return { token, konto: konto as Konto };
  } catch {
    return null;
  }
}
export const testerPassword = (): string => read(PASSWORD_KEY) ?? "";
export const setTesterPassword = (value: string): void => write(PASSWORD_KEY, value.trim() || null);

export async function post<T>(path: string, body: object, ms = 10_000): Promise<Reply<T>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (SERVER_TEST && testerPassword()) headers["X-Lotnik-Haslo"] = testerPassword();
  try {
    const r = await fetch(API + path, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(ms),
    });
    // Odpowiedź naszego serwera (lotnik/serwer/telemark.js) w znanym kształcie.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const j = (await r.json().catch(() => ({}))) as Reply<T>["j"];
    if (j.haslo === true) write(PASSWORD_KEY, null);
    if (j.relogin === true) write(ACCOUNT_KEY, null);
    return { ok: r.ok, status: r.status, j };
  } catch {
    // Bez odpowiedzi jest tylko błąd; kto pyta, patrzy najpierw na ok.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    return { ok: false, status: 0, j: { error: D2_TEXT.noConnection } as Reply<T>["j"] };
  }
}

/** Logowanie kontem Lotnika; zapisuje sesję tak jak Lotnik (wspólna dla obu gier). */
export async function login(nick: string, password: string): Promise<string | null> {
  const r = await post<{ token: string; konto: Konto }>("/login", { nick, password });
  if (!r.ok) return r.j.error ?? D2_TEXT.loginFailed;
  write(ACCOUNT_KEY, JSON.stringify({ token: r.j.token, konto: r.j.konto }));
  return null;
}
export async function logout(): Promise<void> {
  const s = session();
  write(ACCOUNT_KEY, null);
  if (s) await post("/logout", { token: s.token });
}

export const today = () => post<DayState>("/tm/dzien", session() ? { token: session()?.token } : {});
export const startJump = (grupa: number) => post<Ticket>("/tm/start", { token: session()?.token, grupa });

// --- kolejka wysłanych w chwili lądowania skoków ---
interface Pending {
  bilet: string;
  inputs: string;
  wynik: { p: number; m: number };
  dev: string;
  until: number;
}
type PendingAll = Record<string, Pending>;
const pendingAll = (): PendingAll => {
  try {
    // Kolejka zapisana przez tę samą grę (pendingSet).
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    return (JSON.parse(read(PENDING_KEY) ?? "{}") as PendingAll | null) ?? {};
  } catch {
    return {};
  }
};
const pendingSet = (gid: string, p: Pending | null): void => {
  const all = pendingAll();
  if (p) all[gid] = p;
  else delete all[gid];
  write(PENDING_KEY, JSON.stringify(all));
};

/** Wyniki zapisane przez serwer w tej wizycie (gid → odpowiedź), i co ich słucha. */
const saved = new Map<string, SavedJump | { error: string }>();
const listeners = new Set<() => void>();
export const savedJump = (gid: string) => saved.get(gid);
export function onSaved(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

async function sendOne(gid: string, p: Pending, attempt = 0): Promise<void> {
  const r = await post<SavedJump>("/tm/end", { bilet: p.bilet, inputs: p.inputs, wynik: p.wynik, dev: p.dev }, 15_000);
  if (r.ok || (r.status >= 400 && r.status < 500 && r.status !== 403 && r.status !== 429)) {
    pendingSet(gid, null);
    saved.set(gid, r.ok ? r.j : { error: r.j.error ?? D2_TEXT.jumpRefused });
    listeners.forEach((fn) => fn());
    return;
  }
  if (Date.now() > p.until) {
    pendingSet(gid, null);
    saved.set(gid, { error: D2_TEXT.jumpLost });
    listeners.forEach((fn) => fn());
    return;
  }
  const waitS = [1, 2, 4, 8, 15][attempt] ?? 30;
  setTimeout(() => void sendOne(gid, p, attempt + 1), waitS * 1000);
}

/** Skok po lądowaniu: do kolejki i do serwera (ponawiane przy błędzie sieci, też po ponownym otwarciu gry). */
export function sendJump(ticket: Ticket, inputs: string, wynik: { p: number; m: number }): void {
  const p: Pending = {
    bilet: ticket.bilet,
    inputs,
    wynik,
    dev: navigator.userAgent.slice(0, 200),
    until: Date.now() + PENDING_MS,
  };
  pendingSet(ticket.gid, p);
  void sendOne(ticket.gid, p);
}
/** Skoki z kolejki, które nie doszły przed zamknięciem gry. */
export function resendPending(): void {
  for (const [gid, p] of Object.entries(pendingAll())) void sendOne(gid, p);
}

export interface TableRow {
  nick: string;
  /** Numer konta d2jsp (konto zweryfikowane i połączone z forum), klucz awatara. */
  uid: string | null;
  suma: number;
  dni: number;
  place: number;
}
export interface TablePeriod {
  k: "w" | "m";
  key: string;
  rows: TableRow[];
}
/** Tabele tygodnia i miesiąca (te same co na stronie licznika, d2jsp/strona.js). */
export const tables = () => post<{ day: string; okresy: TablePeriod[] }>("/tm/tabele", {});

export interface Watched {
  gid: string;
  hill: HillInfo;
  seed: number;
  inputs: string;
  nick: string;
  m: number;
  p: number;
  fell: boolean;
  day: string;
  n: number;
}
/** Na serwerze testowym `&test` w adresie pozwala obejrzeć dzisiejszy skok od razu (sprawdzenie ▶ bez czekania). */
const WATCH_TODAY = SERVER_TEST && new URLSearchParams(location.search).has("test");
export const watchJump = (gid: string) => post<Watched>("/tm/skok", { gid, ...(WATCH_TODAY ? { test: true } : {}) });
