import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { HillChoice } from "../game/hill-choice";
import { tiltSupported } from "../game/tilt-input";
import { withJump, withSettings, type Settings } from "../storage/save-data";
import { decodeInputs, encodeInputs } from "../storage/input-codec";
import { UI_TEXT } from "../text/ui-text";
import { AboutScreen } from "../ui/about-screen";
import { useStoredSave } from "../ui/app";
import { HowToScreen } from "../ui/how-to-jump";
import { recordingSource, type ReplaySource } from "../ui/jump-replay";
import { JumpScreen, type ContestJump } from "../ui/jump-screen";
import { SettingsScreen } from "../ui/settings-screen";
import {
  login,
  logout,
  onSaved,
  redeem,
  register,
  resendPending,
  savedJump,
  sendJump,
  session,
  startJump,
  today,
  watchJump,
  type DayState,
  type Ticket,
} from "./api";
import { DailyScreen, type DayNote } from "./daily-screen";
import { PlayerScreen } from "./player-screen";
import { ownHill } from "./jump-check";
import { jumperNick } from "./nick";
import { D2_TEXT as T } from "../text/d2jsp-text";

type Screen =
  | { kind: "day" }
  | { kind: "settings" | "howto" | "about" }
  /** Skok dnia (z biletem) albo na próbę (bez). */
  | { kind: "jump"; hill: HillChoice; ticket: Ticket | null; key: number }
  /** Skoki gracza (?gracz=uid&okres=klucz, klik w nick na stronie licznika). */
  | PlayerView
  /** Obejrzenie skoku z tabeli (?ogladaj=gid) albo z ekranu gracza (`from`: tam wraca). */
  | { kind: "watch"; hill: HillChoice; source: ReplaySource; nick: string; key: number; from: PlayerView | null };
interface PlayerView {
  kind: "player";
  uid: string;
  okres: string;
  day: string | null;
}
type JumpLike = Extract<Screen, { kind: "jump" | "watch" }>;

const GAME_VERSION = import.meta.env.GAME_VERSION;
const NO_OP = () => undefined;
type SetDay = (fn: (d: DayState | null) => DayState | null) => void;

/** Stan dnia z serwera. */
function useDay() {
  const [day, setDay] = useState<DayState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [needsTester, setNeedsTester] = useState(false);
  const reload = useCallback(() => {
    void today().then(async (first) => {
      // Wylogowane urządzenie: serwer skasował sesję, drugi raz pyta już jako gość.
      const r = first.j.relogin === true ? await today() : first;
      setNeedsTester(r.j.haslo === true);
      setLoadError(r.ok ? null : (r.j.error ?? T.offline));
      if (r.ok) setDay(r.j);
    });
  }, []);
  useEffect(reload, [reload]);
  return { day, setDay, loadError, needsTester, reload };
}

/** Wyniki serwera dla skoków tej wizyty, jako wiadomości nad skoczniami, i stan dnia po każdym z nich. */
function useSavedNotes(setDay: SetDay) {
  const [notes, setNotes] = useState<DayNote[]>([]);
  /** Wynik gry przy lądowaniu (gid → punkty i skocznia), do porównania z serwerem. */
  const sent = useRef(new Map<string, { p: number; grupa: number }>());
  useEffect(
    () =>
      onSaved(() => {
        for (const [gid, mine] of sent.current) {
          const r = savedJump(gid);
          if (!r) continue;
          sent.current.delete(gid);
          if ("error" in r) {
            setNotes([{ text: r.error, warn: true }]);
            continue;
          }
          const out: DayNote[] = [{ text: T.saved(r.m, r.p, r.miejsce, r.z, T.groups[mine.grupa] ?? "") }];
          const game = Math.max(0, Math.round(mine.p * 10));
          if (game !== Math.round(r.p * 10)) out.push({ text: T.differs(game / 10, r.p), warn: true });
          setNotes(out);
          setDay((d) => d && { ...d, uzyte: r.uzyte, najlepsze: r.najlepsze, sumy: r.sumy, wynik: r.wynik });
        }
      }),
    [setDay],
  );
  const expect = (gid: string, p: number, grupa: number) => {
    sent.current.set(gid, { p, grupa });
    setNotes([{ text: T.sending }]);
  };
  return { notes, setNotes, expect };
}

/** Skok z tabeli do obejrzenia, gdy adres strony go podaje. */
function watchedGid(): string | null {
  const gid = new URLSearchParams(location.search).get("ogladaj");
  return gid !== null && /^[0-9a-f]{16}$/.test(gid) ? gid : null;
}

/** Ekran gracza, gdy adres strony go podaje (klik w nick na stronie licznika). */
function playerFromUrl(): PlayerView | null {
  const q = new URLSearchParams(location.search);
  const uid = q.get("gracz"),
    okres = q.get("okres");
  return uid !== null && okres !== null && /^[\w-]{1,24}$/.test(uid) && /^(w\d{4}-\d{2}|m\d{4}-\d{2}|y\d{4})$/.test(okres)
    ? { kind: "player", uid, okres, day: null }
    : null;
}

/** Skok z serwera, odtwarzany tak jak skok komputera w zawodach; `from` = ekran gracza, na który wraca. */
function watch(
  gid: string,
  from: PlayerView | null,
  show: (s: Screen) => void,
  nextKey: () => number,
  onError: (text: string) => void,
) {
  void watchJump(gid).then((r) => {
    const hill = r.ok ? ownHill(r.j.hill.id) : undefined;
    const inputs = r.ok ? decodeInputs(r.j.inputs) : null;
    if (!r.ok || !hill || !inputs) {
      onError(r.j.error ?? T.watchError);
      return;
    }
    const source = {
      ...recordingSource({ seed: r.j.seed, inputs, newRecord: false }),
      jumperName: jumperNick(r.j.nick),
    };
    show({ kind: "watch", hill, source, nick: r.j.nick, key: nextKey(), from });
  });
}

/** Przy otwarciu z ?ogladaj=gid od razu oglądany skok, z ?gracz= ekran gracza. */
function useOpenFromUrl(show: (s: Screen) => void, nextKey: () => number, onError: (text: string) => void) {
  const once = useRef(false);
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    const player = playerFromUrl();
    if (player) {
      show(player);
      return;
    }
    const gid = watchedGid();
    if (gid !== null) watch(gid, null, show, nextKey, onError);
  }, [show, nextKey, onError]);
}

interface JumpProps {
  screen: JumpLike;
  save: ReturnType<typeof useStoredSave>;
  /** Nick gracza jako nazwisko skoczka; brak u gościa. */
  nick: string | undefined;
  onSettings: (change: Partial<Settings>) => void;
  back: () => void;
  focusOnEntry: boolean;
  /** Skok dnia wylądował: wysłany, czekamy na wynik serwera. */
  onSent: (gid: string, p: number, grupa: number) => void;
  onTrialResult: (m: number, p: number) => void;
}

/** Skok dnia, skok na próbę albo oglądany skok: ekran skoku gry w trybie zawodów (bez powtórzenia skoku). */
function DailyJump({
  screen,
  save: { save, update },
  nick,
  onSettings,
  back,
  focusOnEntry,
  onSent,
  onTrialResult,
}: JumpProps) {
  const { hill } = screen;
  const ticket = screen.kind === "jump" ? screen.ticket : null;
  const name = nick ?? UI_TEXT.hud.playerName;
  const contest: ContestJump = {
    hudName: screen.kind === "watch" ? jumperNick(screen.nick) : name,
    outfit: save.settings.outfit,
    leader: false,
    cpu: screen.kind === "watch" ? screen.source : null,
    onNext: () => {
      back();
      return true;
    },
    onLeave: back,
    onEnd: back,
    hud: null,
    holder: name,
    exit: { label: ticket ? T.exit : screen.kind === "watch" && screen.from ? T.backToPlayer : T.exitTrial, go: back },
    // Mateusz 14.11: na belce wiatr stoi i można czekać bez końca, bez dyskwalifikacji (też w skoku na próbę).
    waitOnGate: true,
    ...(ticket ? { seed: ticket.seed } : {}),
    onTouchdown: (jump, inputs) => {
      const L = jump.state.logic;
      if (ticket) {
        onSent(ticket.gid, L.points, ticket.grupa);
        sendJump(ticket, encodeInputs(inputs), { p: L.points, m: L.distanceM });
      } else if (screen.kind === "jump") onTrialResult(L.distanceHalfM, Math.max(0, L.points));
    },
  };
  return (
    <JumpScreen
      key={screen.key}
      hill={hill}
      record={save.records[hill.id]}
      recordSave="saved"
      settings={save.settings}
      onSettings={onSettings}
      onFinished={(result) => {
        if (screen.kind === "jump") update((prev) => withJump(prev, hill.id, result, new Date(), name));
      }}
      hills={[]}
      records={save.records}
      onPickHill={NO_OP}
      onExit={back}
      onOpenReplays={NO_OP}
      focusOnEntry={focusOnEntry}
      diagnostics={false}
      openingReplay={null}
      onKeepJump={() => "notReady"}
      recordGhost={null}
      offline={null}
      contest={contest}
    />
  );
}

/** Wyjście na belkę: bilet z serwera (skok zużyty) albo powód odmowy. */
function useStartJump(
  show: (s: Screen) => void,
  nextKey: () => number,
  day: ReturnType<typeof useDay>,
  setNotes: (n: DayNote[]) => void,
) {
  const [starting, setStarting] = useState(false);
  const onJump = (grupa: number) => {
    setStarting(true);
    setNotes([{ text: T.starting }]);
    void startJump(grupa).then((r) => {
      setStarting(false);
      const hill = r.ok ? ownHill(r.j.hill.id) : undefined;
      if (!r.ok || !hill) {
        setNotes([{ text: r.j.error ?? T.offline, warn: true }]);
        if (r.status === 401 || r.status === 403 || r.status === 409) day.reload();
        return;
      }
      setNotes([]);
      day.setDay((d) => d && { ...d, uzyte: (d.uzyte ?? [0, 0, 0]).map((u, g) => (g === grupa ? r.j.n : u)) });
      show({ kind: "jump", hill, ticket: r.j, key: nextKey() });
    });
  };
  const onTrial = (grupa: number) => {
    const id = day.day?.hills[grupa]?.id;
    const hill = id === undefined ? undefined : ownHill(id);
    if (!hill) return;
    setNotes([]);
    show({ kind: "jump", hill, ticket: null, key: nextKey() });
  };
  return { starting, onJump, onTrial };
}

export function D2jspApp() {
  const [screen, setScreen] = useState<Screen>({ kind: "day" });
  const [navigated, setNavigated] = useState(false);
  const show = useCallback((next: Screen) => {
    setNavigated(true);
    setScreen(next);
  }, []);
  const keyRef = useRef(0);
  const nextKey = useCallback(() => ++keyRef.current, []);
  const stored = useStoredSave();
  const onSettings = (change: Partial<Settings>) => stored.update((prev) => withSettings(prev, change));
  const day = useDay();
  const { notes, setNotes, expect } = useSavedNotes(day.setDay);
  const showError = useCallback((text: string) => setNotes([{ text, warn: true }]), [setNotes]);
  const start = useStartJump(show, nextKey, day, setNotes);
  useOpenFromUrl(show, nextKey, showError);
  useEffect(() => resendPending(), []);
  useLayoutEffect(() => {
    document.title = screen.kind === "jump" || screen.kind === "watch" ? `${T.title}: ${screen.hill.name}` : T.title;
    window.scrollTo(0, 0);
  }, [screen]);

  const back = () => show({ kind: "day" });
  const d = day.day;
  const nick = jumperNick(d?.gosc === undefined ? (d?.konto?.nick ?? "") : "") || undefined;
  if (screen.kind === "player") {
    return (
      <PlayerScreen
        key={`${screen.uid}|${screen.okres}`}
        uid={screen.uid}
        okres={screen.okres}
        day={screen.day}
        onDay={(dd) => setScreen({ ...screen, day: dd })}
        onWatch={(gid, onError) => watch(gid, screen, show, nextKey, onError)}
        onBack={back}
        focusOnEntry={navigated}
      />
    );
  }
  if (screen.kind === "jump" || screen.kind === "watch") {
    const from = screen.kind === "watch" ? screen.from : null;
    return (
      <DailyJump
        screen={screen}
        save={stored}
        nick={nick}
        onSettings={onSettings}
        back={from ? () => show(from) : back}
        focusOnEntry={navigated}
        onSent={expect}
        onTrialResult={(m, p) => setNotes([{ text: T.trialResult(m, p) }])}
      />
    );
  }
  const { settings } = stored.save;
  if (screen.kind === "settings") {
    return <SettingsScreen settings={settings} onSettings={onSettings} onBack={back} focusOnEntry={navigated} />;
  }
  if (screen.kind === "about") return <AboutScreen onBack={back} focusOnEntry={navigated} extra={T.aboutFork} />;
  if (screen.kind === "howto") {
    return (
      <HowToScreen tilt={settings.leanControl === "tilt" && tiltSupported()} onBack={back} focusOnEntry={navigated} />
    );
  }
  return (
    <DailyScreen
      day={d}
      loadError={day.loadError}
      versionMismatch={d !== null && d.gosc === undefined && d.sim !== GAME_VERSION}
      notes={notes}
      needsTesterPassword={day.needsTester}
      starting={start.starting}
      onReload={day.reload}
      onLogin={async (n, p) => {
        const err = await login(n, p);
        if (err === null) day.reload();
        return err;
      }}
      onRegister={async (n, p) => {
        const err = await register(n, p);
        if (err === null) day.reload();
        return err;
      }}
      onRedeem={async (n, c, p) => {
        const err = await redeem(n, c, p);
        if (err === null) day.reload();
        return err;
      }}
      account={session()?.konto ?? null}
      onLogout={() => void logout().then(day.reload)}
      onJump={start.onJump}
      onTrial={start.onTrial}
      onOpen={(kind) => show({ kind })}
      focusOnEntry={navigated}
    />
  );
}
