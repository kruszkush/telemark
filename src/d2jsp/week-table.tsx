import { useEffect, useRef, useState, type ReactNode } from "react";
import { D2_TEXT as T } from "../text/d2jsp-text";
import type { TablePeriod, Tables, TodayRow } from "./api";

/**
 * Awatary z forum, które trzyma strona licznika (d2jsp/strona.js wystawia `tmAvatars` na oknie strony); gra poza
 * stroną albo gracz bez awatara: kółko z pierwszą literą nicku, jak w rankingach strony.
 */
function avatarOf(uid: string | null): string | null {
  if (uid === null) return null;
  try {
    const all: unknown = Reflect.get(window.parent, "tmAvatars");
    const map: unknown =
      typeof all === "function" ? Reflect.apply(all, undefined, []) : null;
    const url: unknown =
      typeof map === "object" && map !== null ? Reflect.get(map, uid) : null;
    return typeof url === "string" && url !== "" ? url : null;
  } catch {
    return null;
  }
}

interface Who {
  nick: string;
  uid: string | null;
}

export function Avatar({ row }: { row: Who }) {
  const url = avatarOf(row.uid);
  return url === null ? (
    <span className="d2-av" aria-hidden="true">
      {row.nick.charAt(0).toUpperCase()}
    </span>
  ) : (
    <span
      className="d2-av"
      aria-hidden="true"
      style={{ backgroundImage: `url("${url.replace(/["\\]/g, "")}")` }}
    />
  );
}

/**
 * Wszyscy gracze z tabeli (Mateusz 25.11: „niech pokazuje wszystkich”, z przewijaniem); wiersz gracza wyróżniony.
 * Wcześniej 5 najlepszych i gracz pod spodem.
 */
function allAndMe<R extends Who>(rows: readonly R[], me: string | null) {
  const mine = me === null ? undefined : rows.find((r) => r.nick === me);
  return { shown: rows, mine };
}

/**
 * Okienko tabeli z własnym przewijaniem (wzór: okienko wyścigów na stronie, d2jsp/strona.js `.tmr ul`, 18.11):
 * nagłówek kolumn stoi, wiersze się przewijają; po otwarciu i zmianie zakładki wiersz gracza jest widoczny.
 */
function ScrollBox({
  children,
  mineKey,
  guest,
}: {
  children: ReactNode;
  mineKey: string;
  guest: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    const row = el?.querySelector<HTMLElement>(".contest-player");
    if (!el || !row) return;
    const head = el.querySelector("thead")?.getBoundingClientRect().height ?? 0;
    const r = row.getBoundingClientRect(),
      b = el.getBoundingClientRect();
    if (r.top >= b.top + head && r.bottom <= b.bottom) return;
    // Przewija tylko okienko, nie stronę: wiersz gracza mniej więcej na środek, a pierwszy widoczny wiersz cały,
    // tuż pod nagłówkiem (bez uciętego paska wiersza pod kreską).
    const rows = [...el.querySelectorAll<HTMLElement>("tbody tr")];
    const fit = Math.max(1, Math.floor((el.clientHeight - head) / r.height));
    const first =
      rows[Math.max(0, rows.indexOf(row) - Math.floor((fit - 1) / 2))] ?? row;
    el.scrollTop += first.getBoundingClientRect().top - b.top - head;
  }, [mineKey]);
  return (
    <div ref={box} className={guest ? "d2-table-box d2-guest" : "d2-table-box"}>
      {children}
    </div>
  );
}

function Name({ row }: { row: Who }) {
  return (
    <th scope="row" className="contest-name">
      {/* Awatar w nazwie, jak flaga w tabelach zawodów autora (.contest-who .flag-icon). */}
      <span className="contest-who">
        <Avatar row={row} />
        {row.nick}
      </span>
    </th>
  );
}

function PlaceHead() {
  return (
    <th scope="col" className="contest-place">
      <span aria-hidden="true">{T.tablePlace}</span>
      <span className="sr-only">{T.tablePlaceLong}</span>
    </th>
  );
}

function Week({ period, me }: { period: TablePeriod; me: string | null }) {
  const { shown, mine } = allAndMe(period.rows, me);
  return (
    <ScrollBox mineKey={`w${mine?.place ?? ""}`} guest={me === null}>
      <table className="contest-table d2-table">
        <caption className="sr-only">
          {T.tableCaption(period.k, period.key)}
        </caption>
        <thead>
          <tr>
            <PlaceHead />
            <th scope="col">{T.tableName}</th>
            <th scope="col" className="contest-total">
              {T.tableDays}
            </th>
            <th scope="col" className="contest-total">
              {T.tablePoints}
            </th>
          </tr>
        </thead>
        <tbody>
          {shown.length === 0 && (
            <tr className="contest-row">
              <td colSpan={4}>{T.tableEmpty}</td>
            </tr>
          )}
          {shown.map((r) => (
            <tr
              key={r.nick}
              className={
                r === mine ? "contest-row contest-player" : "contest-row"
              }
            >
              <td className="contest-place">{`${r.place}.`}</td>
              <Name row={r} />
              <td className="contest-total">{r.dni}</td>
              <td className="contest-total">{T.points(r.suma)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollBox>
  );
}

/** Dzisiaj: punkty z 2 najlepszych skoków na każdej skoczni, skoki i wynik dnia (Mateusz 14.11, proto/tabela-dnia). */
function Today({
  rows,
  me,
  jumps,
}: {
  rows: readonly TodayRow[];
  me: string | null;
  jumps: number;
}) {
  const { shown, mine } = allAndMe(rows, me);
  return (
    <ScrollBox mineKey={`d${mine?.place ?? ""}`} guest={me === null}>
      <table className="contest-table d2-table">
        <caption className="sr-only">{T.tabToday}</caption>
        <thead>
          <tr>
            <PlaceHead />
            <th scope="col">{T.tableName}</th>
            {T.groups.map((g) => (
              <th key={g} scope="col" className="contest-total d2-hcol">
                {g}
              </th>
            ))}
            <th scope="col" className="contest-total">
              {T.tableJumps}
            </th>
            <th scope="col" className="contest-total">
              {T.tableDay}
            </th>
          </tr>
        </thead>
        <tbody>
          {shown.length === 0 && (
            <tr className="contest-row">
              <td colSpan={7}>{T.tableEmpty}</td>
            </tr>
          )}
          {shown.map((r) => (
            <tr
              key={r.nick}
              className={
                r === mine ? "contest-row contest-player" : "contest-row"
              }
            >
              <td className="contest-place">{`${r.place}.`}</td>
              <Name row={r} />
              {T.groups.map((g, i) => (
                <td key={g} className="contest-total d2-hcol">
                  {(r.uzyte?.[i] ?? 1) === 0
                    ? T.noJumps
                    : T.points(r.sumy[i] ?? 0)}
                </td>
              ))}
              <td className="contest-total">{T.jumpsOf(r.skoki, jumps)}</td>
              <td className="contest-total">{T.points(r.wynik)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollBox>
  );
}

/**
 * Mała tabela na górze ekranu dnia, w stylu tabel zawodów autora (contest-table): domyślnie „Dzisiaj”, przełącznik
 * na bieżący tydzień; miesiąc i poprzednie okresy są na stronie. Dane pobiera ekran dnia (daily-screen.tsx), wspólnie
 * z rekordami kart skoczni.
 */
export function WeekTable({
  data,
  me,
  jumps,
}: {
  data: Tables | null;
  me: string | null;
  jumps: number;
}) {
  const [tab, setTab] = useState<"d" | "w">("d");
  if (data === null) return null;
  const week = data.okresy.find((p: TablePeriod) => p.k === "w");
  return (
    <section className="d2-tables" aria-label={T.tablesLabel}>
      <div className="d2-tabs">
        <button
          type="button"
          className="d2-tab"
          aria-pressed={tab === "d"}
          onClick={() => setTab("d")}
        >
          {T.tabToday}
        </button>
        {week && (
          <button
            type="button"
            className="d2-tab"
            aria-pressed={tab === "w"}
            onClick={() => setTab("w")}
          >
            {T.tableCaption(week.k, week.key)}
          </button>
        )}
      </div>
      {tab === "d" || !week ? (
        <Today rows={data.dzis ?? []} me={me} jumps={jumps} />
      ) : (
        <Week period={week} me={me} />
      )}
    </section>
  );
}
