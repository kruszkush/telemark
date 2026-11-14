import { useEffect, useRef, useState } from "react";
import { D2_TEXT as T } from "../text/d2jsp-text";
import { UI_TEXT } from "../text/ui-text";
import { useEntryFocus } from "../ui/use-entry-focus";
import { playerDay, playerPeriod, SERVER_TEST, type PlayerDay, type PlayerPeriod } from "./api";
import { Avatar } from "./week-table";

/** Na serwerze testowym `&test` w adresie pozwala obejrzeć dzisiejszy skok od razu (jak watchJump w api.ts). */
const WATCH_TODAY = SERVER_TEST && new URLSearchParams(location.search).has("test");

interface Props {
  uid: string;
  okres: string;
  /** Dzień otwarty przy powrocie z oglądanego skoku; null = ostatni dzień okresu. */
  day: string | null;
  onDay: (day: string) => void;
  /** ▶: oglądany skok; błąd serwera wraca do `onError`. */
  onWatch: (gid: string, onError: (text: string) => void) => void;
  onBack: () => void;
  focusOnEntry: boolean;
}

/** Skoki jednego dnia: trzy skocznie jak na ekranie dnia, każdy skok z ▶, dwa liczone wyróżnione. */
function DayJumps({ data, onWatch }: { data: PlayerDay; onWatch: (gid: string) => void }) {
  const locked = data.day >= data.dzis && !WATCH_TODAY;
  return (
    <>
      <h2 className="hill-section-title">{T.playerDayTitle(data.day, data.wynik)}</h2>
      {locked && <p className="note">{T.playerToday}</p>}
      <div className="d2-hills">
        {data.hills.map((hill, g) => {
          const list = data.skoki[g] ?? [];
          return (
            <section key={hill.id} className="d2-hill" aria-labelledby={`d2-ph-${g}`}>
              <h3 className="hill-section-title" id={`d2-ph-${g}`}>
                {`${T.groups[g] ?? ""}: ${UI_TEXT.hillLabel(hill.name, hill.kPointM)} · ${T.points(data.sumy[g] ?? 0)}`}
              </h3>
              {list.length === 0 && <p className="note">{T.playerNoHillJumps}</p>}
              <ul className="d2-lines d2-pjumps">
                {list.map((j) =>
                  j.niedokonczony === true ? (
                    <li key={j.n}>{`${j.n}. ${T.playerUnfinished}`}</li>
                  ) : (
                    <li key={j.n} className={j.liczony ? "d2-best" : undefined}>
                      <button
                        type="button"
                        className="d2-play"
                        disabled={locked}
                        title={locked ? T.playerToday : T.playerWatch(j.n)}
                        aria-label={T.playerWatch(j.n)}
                        onClick={() => onWatch(j.gid)}
                      >
                        {T.playIcon}
                      </button>
                      {T.playerJump(j.n, j.m, j.p, j.fell)}
                      {j.liczony && <span className="d2-counted">{T.playerCounted}</span>}
                    </li>
                  ),
                )}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}

/**
 * „Skoki gracza” (Mateusz 14.11, zasady_d2jsp.md „Strona licznika”): otwierany kliknięciem nicka na stronie licznika
 * (?gracz=uid&okres=klucz). Dni okresu z wynikiem (liczone wyróżnione), pod nimi skoki wybranego dnia na trzech
 * skoczniach z ▶; dzisiejsze ▶ zablokowane do jutra (wspólny wiatr dnia). Wygląd bez wzoru, z elementów ekranu dnia.
 */
export function PlayerScreen({ uid, okres, day, onDay, onWatch, onBack, focusOnEntry }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEntryFocus(headingRef, focusOnEntry);
  const [period, setPeriod] = useState<PlayerPeriod | null>(null);
  const [jumps, setJumps] = useState<PlayerDay | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void playerPeriod(uid, okres).then((r) => {
      if (!live) return;
      if (!r.ok) {
        setError(r.j.error ?? T.playerError);
        return;
      }
      setPeriod(r.j);
    });
    return () => {
      live = false;
    };
  }, [uid, okres]);
  const shown = day ?? period?.dni.at(-1)?.day ?? null;
  useEffect(() => {
    let live = true;
    if (shown !== null) {
      void playerDay(uid, shown).then((r) => {
        if (!live) return;
        if (r.ok) setJumps(r.j);
        else setError(r.j.error ?? T.playerError);
      });
    }
    return () => {
      live = false;
    };
  }, [uid, shown]);
  // Skoki poprzednio wybranego dnia nie zostają na ekranie, póki nowe się wczytują.
  const dayJumps = jumps?.day === shown ? jumps : null;

  return (
    <main className="screen d2-day d2-player">
      <header className="d2-head">
        <h1 className="screen-title" tabIndex={-1} ref={headingRef}>
          {T.playerTitle}
          {period && (
            <span className="d2-pwho">
              <Avatar row={{ nick: period.nick, uid }} />
              {period.nick}
            </span>
          )}
        </h1>
        <button type="button" className="pixel-button d2-small" onClick={onBack}>
          {T.back}
        </button>
      </header>
      {error !== null && <p className="note d2-warn">{error}</p>}
      {period === null && error === null && <p className="note">{T.playerLoading}</p>}
      {period && (
        <>
          <p className="note">{T.playerPeriod(period.okres, period.suma, period.n)}</p>
          {period.dni.length === 0 ? (
            <p className="note">{T.playerNoDays}</p>
          ) : (
            <div className="d2-pdays" role="group" aria-label={T.playerDays}>
              {period.dni.map((d) => (
                <button
                  key={d.day}
                  type="button"
                  className={d.liczony ? "d2-pday d2-pcount" : "d2-pday"}
                  aria-pressed={d.day === shown}
                  title={d.liczony ? T.playerCountedDay : undefined}
                  onClick={() => onDay(d.day)}
                >
                  <b>{T.playerDay(d.day)}</b>
                  {T.points(d.wynik)}
                </button>
              ))}
            </div>
          )}
          {dayJumps ? (
            <DayJumps data={dayJumps} onWatch={(gid) => onWatch(gid, setError)} />
          ) : (
            shown !== null && <p className="note">{T.playerLoading}</p>
          )}
        </>
      )}
    </main>
  );
}
