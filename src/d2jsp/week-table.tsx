import { useEffect, useState } from "react";
import { D2_TEXT as T } from "../text/d2jsp-text";
import { tables, type TablePeriod } from "./api";

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
              <span className="contest-who">{r.nick}</span>
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
 * Odświeżana przy każdym wejściu na ekran dnia. Arkusz prób: test-results/d2jsp-tabela (14.11, wybrana próba A).
 */
export function WeekTable({ me }: { me: string | null }) {
  const [periods, setPeriods] = useState<TablePeriod[] | null>(null);
  useEffect(() => {
    let live = true;
    void tables().then((r) => {
      if (live && r.ok) setPeriods(r.j.okresy);
    });
    return () => {
      live = false;
    };
  }, []);
  if (periods === null) return null;
  const week = periods.find((p) => p.k === "w");
  return <section className="d2-tables">{week && <Period period={week} me={me} top={TOP} />}</section>;
}
