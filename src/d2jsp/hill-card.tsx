import { UI_TEXT } from "../text/ui-text";
import { D2_TEXT as T } from "../text/d2jsp-text";
import type { DayRecords, DayState, HillInfo, HillRecord, JumpScore } from "./api";
import { Avatar } from "./week-table";

/**
 * Karta skoczni na ekranie dnia (Mateusz 14.11, makieta proto/uklad-dnia, wygląd wymyślony): nazwa, rekord dnia i
 * rekord skoczni z awatarem, pod kreską 2 najlepsze skoki gracza z kwadracikami zużytych skoków, „Razem” i przycisk.
 */
interface Props {
  hill: HillInfo;
  g: number;
  day: DayState;
  records: DayRecords | null;
  /** Skocznia z kolejki 2-2-2 (tylko ona ma „Skacz”); null u gościa. */
  next: number | null;
  starting: boolean;
  onJump: (grupa: number) => void;
  onTrial: (hillId: string) => void;
}

/** Rekord z serwera, tylko gdy dotyczy tej skoczni (ekran otwarty przez północ dostałby rekordy nowych skoczni). */
export function recordFor(list: readonly (HillRecord | null)[] | undefined, g: number, hillId: string): HillRecord | null {
  const r = list?.[g] ?? null;
  return r !== null && r.hill === hillId ? r : null;
}

/**
 * Wiersz rekordu w równych kolumnach (Mateusz 14.11: „gryzie się”): opis, awatar, nick skracany kropkami w obu
 * wierszach jednakowo, metry i data zawsze w tym samym miejscu (rekord dnia ma pustą kolumnę daty).
 */
function Record({ label, rec, withDate }: { label: string; rec: HillRecord | null; withDate: boolean }) {
  return (
    <div className="d2-rec">
      <span className="d2-rec-label">{label}</span>
      {rec === null ? (
        <span className="d2-rec-none">{T.recordNone}</span>
      ) : (
        <>
          <Avatar row={rec} />
          <span className="d2-rec-nick">{rec.nick}</span>
          <b className="d2-rec-m">{T.metersUnit(rec.m)}</b>
          <small className="d2-rec-date">{withDate ? T.shortDate(rec.day) : ""}</small>
        </>
      )}
    </div>
  );
}

/** 10 kwadracików: zużyte skoki wypełnione. */
function Dots({ used, limit }: { used: number; limit: number }) {
  return (
    <span className="d2-dots" role="img" aria-label={T.used(used, limit)}>
      {Array.from({ length: limit }, (_, i) => (
        <i key={i} className={i < used ? "d2-dot-used" : undefined} />
      ))}
    </span>
  );
}

function Jump({ j }: { j: JumpScore }) {
  return (
    <div className="d2-jump">
      <span className="d2-jump-m">
        {T.metersUnit(j.m)}
        {j.fell === true && <span className="d2-fell">{` ${T.fell}`}</span>}
      </span>
      <span className="d2-jump-p">{T.pointsUnit(j.p)}</span>
    </div>
  );
}

export function HillCard({ hill, g, day, records, next, starting, onJump, onTrial }: Props) {
  const guest = day.gosc !== undefined;
  const used = day.uzyte?.[g] ?? 0;
  const best = day.najlepsze?.[g] ?? [];
  return (
    <section className={g === next ? "d2-hill d2-next" : "d2-hill"} aria-labelledby={`d2-hill-${g}`}>
      <h3 className="hill-section-title" id={`d2-hill-${g}`}>
        {`${T.groups[g] ?? ""}: ${UI_TEXT.hillLabel(hill.name, hill.kPointM)}`}
      </h3>
      <div className="d2-recs">
        <Record label={T.recordDay} rec={recordFor(records?.dzis, g, hill.id)} withDate={false} />
        <Record label={T.recordHill} rec={recordFor(records?.skocznia, g, hill.id)} withDate />
      </div>
      {!guest && (
        <>
          <div className="d2-legend">
            {T.yourBest}
            <Dots used={used} limit={day.limit} />
          </div>
          {best.length === 0 ? <p className="note d2-empty">{T.noJumpYet}</p> : best.map((j) => <Jump key={j.gid} j={j} />)}
          <div className="d2-sum">
            <span>{T.hillSumLabel}</span>
            <b>{T.pointsUnit(day.sumy?.[g] ?? 0)}</b>
          </div>
        </>
      )}
      {guest ? (
        <button type="button" className="pixel-button" disabled={starting} onClick={() => onTrial(hill.id)}>
          {T.trial}
        </button>
      ) : g === next ? (
        <button type="button" className="pixel-button" disabled={starting} onClick={() => onJump(g)}>
          {T.jump(used + 1, day.limit)}
        </button>
      ) : used >= day.limit ? (
        <p className="note">{T.allUsed}</p>
      ) : null}
    </section>
  );
}
