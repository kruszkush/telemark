import { useRef, useState } from "react";
import { UI_TEXT } from "../text/ui-text";
import { useEntryFocus } from "../ui/use-entry-focus";
import { SERVER_TEST, setTesterPassword, type DayState } from "./api";
import { D2_TEXT as T } from "../text/d2jsp-text";
import { WeekTable } from "./week-table";

/** Co widać pod nagłówkiem po ostatnim skoku albo przy błędzie. */
export interface DayNote {
  text: string;
  /** Ostrzeżenie (różnica wyniku, odmowa serwera) zamiast zwykłej wiadomości. */
  warn?: boolean;
}

interface Props {
  day: DayState | null;
  /** Błąd wczytania dnia; null, gdy wczytany albo w trakcie. */
  loadError: string | null;
  /** Gra jest w innej wersji niż symulacja serwera: skoki by się nie zgodziły. */
  versionMismatch: boolean;
  notes: readonly DayNote[];
  /** Serwer testowy prosi o hasło testerów. */
  needsTesterPassword: boolean;
  /** Czekamy na bilet skoku (przycisk nie działa drugi raz). */
  starting: boolean;
  onReload: () => void;
  onLogin: (nick: string, password: string) => Promise<string | null>;
  onLogout: () => void;
  onJump: (grupa: number) => void;
  onTrial: (grupa: number) => void;
  onOpen: (kind: "settings" | "howto" | "about") => void;
  focusOnEntry: boolean;
}

function LoginForm({ onLogin }: { onLogin: Props["onLogin"] }) {
  const [nick, setNick] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (busy || nick.trim() === "" || password === "") return;
    setBusy(true);
    setError("");
    void onLogin(nick.trim(), password).then((err) => {
      setBusy(false);
      if (err !== null) setError(err);
    });
  };
  return (
    <form className="d2-login" onSubmit={submit}>
      <h2 className="hill-section-title">{T.loginTitle}</h2>
      <label>
        {T.nick}
        <input value={nick} onChange={(e) => setNick(e.target.value)} autoComplete="username" maxLength={40} />
      </label>
      <label>
        {T.password}
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          maxLength={200}
        />
      </label>
      <button type="submit" className="pixel-button" disabled={busy}>
        {busy ? T.loggingIn : T.login}
      </button>
      {error && (
        <p className="note d2-warn" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function TesterPassword({ onSaved }: { onSaved: () => void }) {
  const [value, setValue] = useState("");
  return (
    <form
      className="d2-login"
      onSubmit={(e) => {
        e.preventDefault();
        setTesterPassword(value);
        onSaved();
      }}
    >
      <p className="note d2-warn">{T.testerNeeded}</p>
      <label>
        {T.testerPassword}
        <input type="password" value={value} onChange={(e) => setValue(e.target.value)} maxLength={100} />
      </label>
      <button type="submit" className="pixel-button">
        {T.testerSave}
      </button>
    </form>
  );
}

function Hills({ day, starting, onJump, onTrial }: Pick<Props, "starting" | "onJump" | "onTrial"> & { day: DayState }) {
  const guest = day.gosc !== undefined;
  return (
    <div className="d2-hills">
      {day.hills.map((hill, g) => {
        const used = day.uzyte?.[g] ?? 0;
        const best = day.najlepsze?.[g] ?? [];
        return (
          <section key={hill.id} className="d2-hill" aria-labelledby={`d2-hill-${g}`}>
            <h2 className="hill-section-title" id={`d2-hill-${g}`}>
              {`${T.groups[g] ?? ""}: ${UI_TEXT.hillLabel(hill.name, hill.kPointM)}`}
            </h2>
            {!guest && (
              <ul className="d2-lines">
                <li>{T.used(used, day.limit)}</li>
                {best.length === 0 && <li>{T.noJumpYet}</li>}
                {best.map((j) => (
                  <li key={j.gid} className="d2-best">
                    {T.bestJump(j)}
                  </li>
                ))}
                {best.length > 0 && <li>{T.hillSum(day.sumy?.[g] ?? 0)}</li>}
              </ul>
            )}
            {guest ? (
              <button type="button" className="pixel-button" disabled={starting} onClick={() => onTrial(g)}>
                {T.trial}
              </button>
            ) : used < day.limit ? (
              <button type="button" className="pixel-button" disabled={starting} onClick={() => onJump(g)}>
                {T.jump(used + 1, day.limit)}
              </button>
            ) : (
              <p className="note">{T.allUsed}</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

/** Ekran trybu d2jsp: konto, trzy skocznie dnia ze skokami gracza i wynik dnia. */
export function DailyScreen(props: Props) {
  const { day } = props;
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEntryFocus(headingRef, props.focusOnEntry);
  const guest = day?.gosc !== undefined;
  return (
    <main className="screen d2-day">
      <header className="d2-head">
        <h1 className="screen-title" tabIndex={-1} ref={headingRef}>
          {T.title}
        </h1>
        {day?.konto && !guest && (
          <p className="note d2-account">
            {T.loggedAs(day.konto.nick)}
            <button type="button" className="pixel-button d2-small" onClick={props.onLogout}>
              {T.logout}
            </button>
          </p>
        )}
      </header>
      <WeekTable me={guest ? null : (day?.konto?.nick ?? null)} />
      {props.needsTesterPassword && SERVER_TEST && <TesterPassword onSaved={props.onReload} />}
      {props.notes.map((n) => (
        <p key={n.text} className={n.warn === true ? "note d2-warn" : "note d2-result"} role="status">
          {n.text}
        </p>
      ))}
      {props.versionMismatch && <p className="note d2-warn">{T.newVersion}</p>}
      {props.loadError !== null && !props.needsTesterPassword && (
        <>
          <p className="note d2-warn">{props.loadError}</p>
          <button type="button" className="pixel-button" onClick={props.onReload}>
            {T.retry}
          </button>
        </>
      )}
      {day === null && props.loadError === null && <p className="note">{T.loading}</p>}
      {day !== null && (
        <>
          {guest && (
            <>
              <p className="note d2-warn">{day.gosc}</p>
              {day.konto ? (
                <button type="button" className="pixel-button d2-small" onClick={props.onLogout}>
                  {T.logout}
                </button>
              ) : (
                <LoginForm onLogin={props.onLogin} />
              )}
              <p className="note">{T.guestNote}</p>
            </>
          )}
          <Hills day={day} starting={props.starting || props.versionMismatch} onJump={props.onJump} onTrial={props.onTrial} />
          {!guest && <p className="d2-total">{T.dayTotal(day.wynik ?? 0)}</p>}
        </>
      )}
      <p className="note d2-fine">
        {T.rules} {!guest && T.usedNote}
      </p>
      <div className="d2-buttons">
        <button type="button" className="pixel-button" onClick={() => props.onOpen("settings")}>
          {T.settings}
        </button>
        <button type="button" className="pixel-button" onClick={() => props.onOpen("howto")}>
          {T.howTo}
        </button>
        <button type="button" className="pixel-button" onClick={() => props.onOpen("about")}>
          {T.about}
        </button>
      </div>
    </main>
  );
}
