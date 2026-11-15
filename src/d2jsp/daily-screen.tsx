import { useEffect, useRef, useState } from "react";
import { UI_TEXT } from "../text/ui-text";
import { useEntryFocus } from "../ui/use-entry-focus";
import { SERVER_TEST, setTesterPassword, tables, type DayRecords, type DayState, type Konto, type Tables } from "./api";
import { HillCard } from "./hill-card";
import { VerifiedOnce, VerifyBox } from "./verify-box";
import { D2_TEXT as T } from "../text/d2jsp-text";
import { nextHill } from "./next-hill";
import { TRAINING_HILL_ID } from "./daily";
import { ownHill } from "./jump-check";
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
  onRegister: (nick: string, password: string) => Promise<string | null>;
  onRedeem: (nick: string, code: string, password: string) => Promise<string | null>;
  /** Konto zapisane na tym urządzeniu (z kodem weryfikacji, którego dzień z serwera nie podaje); null bez konta. */
  account: Konto | null;
  onLogout: () => void;
  onJump: (grupa: number) => void;
  /** Skok bez zapisu na podanej skoczni: próba gościa na skoczni dnia albo trening zalogowanego. */
  onTrial: (hillId: string) => void;
  onOpen: (kind: "settings" | "howto" | "about") => void;
  focusOnEntry: boolean;
}

/**
 * Nick i hasło z dwoma przyciskami, jak w Lotniku (lotnik/konto.js: showForm): „Załóż konto” i „Zaloguj”; pod nimi
 * „Mam kod od admina” przełącza na nick, kod i nowe hasło z „Ustaw hasło”.
 */
function LoginForm({ onLogin, onRegister, onRedeem }: Pick<Props, "onLogin" | "onRegister" | "onRedeem">) {
  const [nick, setNick] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [withCode, setWithCode] = useState(false);
  const [busy, setBusy] = useState<"login" | "register" | "redeem" | null>(null);
  const [error, setError] = useState("");
  const send = (kind: "login" | "register" | "redeem") => {
    if (busy !== null || nick.trim() === "" || password === "" || (kind === "redeem" && code.trim() === "")) return;
    setBusy(kind);
    setError("");
    const n = nick.trim();
    const call =
      kind === "redeem" ? onRedeem(n, code.trim(), password) : (kind === "login" ? onLogin : onRegister)(n, password);
    void call.then((err) => {
      setBusy(null);
      if (err !== null) setError(err);
    });
  };
  return (
    <form
      className="d2-login"
      onSubmit={(e) => {
        e.preventDefault();
        send(withCode ? "redeem" : "login");
      }}
    >
      <h2 className="hill-section-title">{T.loginTitle}</h2>
      <p className="note">{withCode ? T.codeHint : T.loginHint}</p>
      <label>
        {T.nick}
        <input value={nick} onChange={(e) => setNick(e.target.value)} autoComplete="username" maxLength={20} />
      </label>
      {withCode && (
        <label>
          {T.code}
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="XXXX-XXXX"
            autoComplete="off"
            maxLength={12}
          />
        </label>
      )}
      <label>
        {withCode ? T.newPassword : T.password}
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={withCode ? "new-password" : "current-password"}
          maxLength={200}
        />
      </label>
      <div className="d2-login-buttons">
        {withCode ? (
          <button type="submit" className="pixel-button" disabled={busy !== null}>
            {busy === "redeem" ? T.settingPassword : T.setPassword}
          </button>
        ) : (
          <>
            <button type="submit" className="pixel-button" disabled={busy !== null}>
              {busy === "login" ? T.loggingIn : T.login}
            </button>
            <button type="button" className="pixel-button" disabled={busy !== null} onClick={() => send("register")}>
              {busy === "register" ? T.registering : T.register}
            </button>
          </>
        )}
      </div>
      <button
        type="button"
        className="d2-link"
        disabled={busy !== null}
        onClick={() => {
          setWithCode(!withCode);
          setError("");
        }}
      >
        {withCode ? T.codeBack : T.haveCode}
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

/** Nagłówek „Skocznie dnia” i trzy karty skoczni (hill-card.tsx) z rekordami z tabel. */
function Hills({
  day,
  records,
  starting,
  onJump,
  onTrial,
}: Pick<Props, "starting" | "onJump" | "onTrial"> & { day: DayState; records: DayRecords | null }) {
  // Zalogowany skacze tylko na skoczni z kolejki (2-2-2, next-hill.ts); gość wybiera skocznię do skoku na próbę.
  const next = day.gosc !== undefined ? null : nextHill(day.uzyte ?? [], day.hills.length, day.limit);
  return (
    <>
      <h2 className="hill-section-title d2-sec">{T.title}</h2>
      <div className="d2-hills">
        {day.hills.map((hill, g) => (
          <HillCard
            key={hill.id}
            hill={hill}
            g={g}
            day={day}
            records={records}
            next={next}
            starting={starting}
            onJump={onJump}
            onTrial={onTrial}
          />
        ))}
      </div>
    </>
  );
}

/**
 * Skocznia treningowa zalogowanego (Mateusz 14.11): jedna stała, bez limitu i bez zapisu. W wierszu wyniku dnia, bo
 * osobny wiersz wypychał ekran dnia poza okno (mysz 1650×800).
 */
function Training({ starting, onTrial }: Pick<Props, "starting" | "onTrial">) {
  const hill = ownHill(TRAINING_HILL_ID);
  if (!hill) return null;
  return (
    <section className="d2-train" aria-labelledby="d2-train">
      <h2 className="hill-section-title" id="d2-train">
        {`${T.trainingTitle}: ${UI_TEXT.hillLabel(hill.name, hill.kPointM)}`}
      </h2>
      <span className="note">{T.trainingNote}</span>
      <button
        type="button"
        className="pixel-button d2-small"
        disabled={starting}
        onClick={() => onTrial(hill.id)}
        aria-label={T.training}
      >
        {T.trainingShort}
      </button>
    </section>
  );
}

/** Koniec dnia (po wszystkich skokach), wynik dnia zalogowanego gracza i obok trening. */
function DayFooter({ day, children }: { day: NonNullable<Props["day"]>; children: React.ReactNode }) {
  const done = nextHill(day.uzyte ?? [], day.hills.length, day.limit) === null;
  return (
    <>
      {done && <p className="note d2-result">{T.dayDone}</p>}
      <div className="d2-foot">
        <p className="d2-total">{T.dayTotal(day.wynik ?? 0)}</p>
        {children}
      </div>
    </>
  );
}

/**
 * Konto pod tabelą: gość bez konta loguje się albo zakłada konto, niezweryfikowane konto weryfikuje się tu (nie w
 * Lotniku), a po weryfikacji raz widać potwierdzenie.
 */
function AccountPart({
  day,
  account,
  onLogin,
  onRegister,
  onRedeem,
  onLogout,
}: Pick<Props, "account" | "onLogin" | "onRegister" | "onRedeem" | "onLogout"> & { day: DayState }) {
  if (day.gosc === undefined) {
    return day.konto?.verified === true && account ? <VerifiedOnce id={account.id} /> : null;
  }
  // Kod jest tylko w koncie zapisanym na urządzeniu; czy konto już zweryfikowane, mówi dzień z serwera.
  const kod = account?.kod;
  const unverified =
    day.konto?.verified === false && account && typeof kod === "string" && kod !== "" ? { ...account, kod } : null;
  return (
    <>
      {unverified ? <VerifyBox konto={unverified} /> : <p className="note d2-warn">{day.gosc}</p>}
      {day.konto ? (
        <p className="note d2-account">
          {T.loggedAs(day.konto.nick)}
          <button type="button" className="pixel-button d2-small" onClick={onLogout}>
            {T.logout}
          </button>
        </p>
      ) : (
        <LoginForm onLogin={onLogin} onRegister={onRegister} onRedeem={onRedeem} />
      )}
      {!unverified && <p className="note">{T.guestNote}</p>}
    </>
  );
}

/** Ekran trybu d2jsp: konto, trzy skocznie dnia ze skokami gracza i wynik dnia. */
export function DailyScreen(props: Props) {
  const { day } = props;
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEntryFocus(headingRef, props.focusOnEntry);
  const guest = day?.gosc !== undefined;
  // Tabele i rekordy jednym pobraniem: przy wejściu na ekran i po każdym skoku zapisanym przez serwer (zmienia się
  // liczba skoków; zapis skoku czyści pamięć tabel serwera). Cudze skoki dochodzą przy następnym pobraniu.
  const version = (day?.uzyte ?? []).join();
  const [data, setData] = useState<Tables | null>(null);
  useEffect(() => {
    let live = true;
    void tables().then((r) => {
      if (live && r.ok) setData(r.j);
    });
    return () => {
      live = false;
    };
    // `version` nie wchodzi do zapytania: tylko mówi, kiedy pobrać tabele jeszcze raz.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [version]);
  return (
    <main className="screen d2-day">
      <header className="d2-head">
        <h1 className="screen-title" tabIndex={-1} ref={headingRef}>
          {T.gameTitle}
          {day && <span className="d2-date">{T.dateLine(day.day)}</span>}
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
      <WeekTable
        data={data}
        me={guest ? null : (day?.konto?.nick ?? null)}
        jumps={(day?.limit ?? 10) * (day?.hills.length ?? 3)}
      />
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
          <AccountPart {...props} day={day} />
          <Hills
            day={day}
            records={data?.rekordy ?? null}
            starting={props.starting || props.versionMismatch}
            onJump={props.onJump}
            onTrial={props.onTrial}
          />
          {!guest && (
            <DayFooter day={day}>
              <Training starting={props.starting || props.versionMismatch} onTrial={props.onTrial} />
            </DayFooter>
          )}
        </>
      )}
      <p className="note d2-fine">
        {T.rulesStart} <span className="d2-key">{T.rulesKey}</span>
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
