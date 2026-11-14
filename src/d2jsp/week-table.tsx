import { useEffect, useState } from "react";
import { D2_TEXT as T } from "../text/d2jsp-text";
import { tables, type TablePeriod, type TableRow } from "./api";

/**
 * Awatary z forum, które trzyma strona licznika (d2jsp/strona.js wystawia `tmAvatars` na oknie strony); gra poza
 * stroną albo gracz bez awatara: kółko z pierwszą literą nicku, jak w rankingach strony.
 */
function avatarOf(uid: string | null): string | null {
  if (uid === null) return null;
  try {
    const all: unknown = Reflect.get(window.parent, "tmAvatars");
    const map: unknown = typeof all === "function" ? Reflect.apply(all, undefined, []) : null;
    const url: unknown = typeof map === "object" && map !== null ? Reflect.get(map, uid) : null;
    return typeof url === "string" && url !== "" ? url : null;
  } catch {
    return null;
  }
}

function Avatar({ row }: { row: TableRow }) {
  const url = avatarOf(row.uid);
  return url === null ? (
    <span className="d2-av" aria-hidden="true">
      {row.nick.charAt(0).toUpperCase()}
    </span>
  ) : (
    <span className="d2-av" aria-hidden="true" style={{ backgroundImage: `url("${url.replace(/["\\]/g, "")}")` }} />
  );
}

/** Tyle wierszy pokazuje mała tabela na ekranie dnia; gracz spoza nich dochodzi pod spodem. */
const TOP = 5;

function Period({ period, me, top }: { period: TablePeriod; me: string | null; top: number }) {
  const shown = period.rows.slice(0, top);
  const mine = me === null ? undefined : period.rows.find((r) => r.nick === me);
  if (mine && !shown.includes(mine)) shown.push(mine);
  return (
    <table className="contest-table d2-table">
      <caption>{T.tableCaption(period.k, period.key)}</caption>
      <thead>
        <tr>
          <th scope="col" className="contest-place">
            <span aria-hidden="true">{T.tablePlace}</span>
            <span className="sr-only">{T.tablePlaceLong}</span>
          </th>
          <th scope="col">{T.tableName}</th>
          <th scope="col" className="contest-total">
            {T.tablePoints}
          </th>
        </tr>
      </thead>
      <tbody>
        {shown.length === 0 && (
          <tr className="contest-row">
            <td colSpan={3}>{T.tableEmpty}</td>
          </tr>
        )}
        {shown.map((r) => (
          <tr key={r.nick} className={r === mine ? "contest-row contest-player" : "contest-row"}>
            <td className="contest-place">{`${r.place}.`}</td>
            <th scope="row" className="contest-name">
              {/* Awatar w nazwie, jak flaga w tabelach zawodów autora (.contest-who .flag-icon). */}
              <span className="contest-who">
                <Avatar row={r} />
                {r.nick}
              </span>
            </th>
            <td className="contest-total">{T.points(r.suma)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Mała tabela tygodnia na górze ekranu dnia, w stylu tabel zawodów autora (contest-table); miesiąc jest na stronie.
 * Pobierana przy wejściu na ekran dnia i po każdym skoku zapisanym przez serwer (zmienia się `version`; serwer trzyma
 * tabelę do 60 s, ale zapis skoku ją czyści). Arkusz prób: test-results/d2jsp-tabela (14.11, wybrana próba A).
 */
export function WeekTable({ me, version }: { me: string | null; version: string }) {
  const [periods, setPeriods] = useState<TablePeriod[] | null>(null);
  useEffect(() => {
    let live = true;
    void tables().then((r) => {
      if (live && r.ok) setPeriods(r.j.okresy);
    });
    return () => {
      live = false;
    };
    // `version` (liczby skoków gracza) nie wchodzi do zapytania: tylko mówi, kiedy pobrać tabelę jeszcze raz.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [version]);
  if (periods === null) return null;
  const week = periods.find((p) => p.k === "w");
  return <section className="d2-tables">{week && <Period period={week} me={me} top={TOP} />}</section>;
}
