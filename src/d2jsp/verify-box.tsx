import { useState } from "react";
import { D2_TEXT as T } from "../text/d2jsp-text";
import { VERIFY_URL, setVerifyState, verifyState, type Konto } from "./api";

/** Po tylu godzinach od „Zweryfikuj” ramka podpowiada, co mogło pójść źle (lotnik/konto.js: showAccount). */
const SLOW_MS = 6 * 3600 * 1000;

/**
 * Kopia do schowka bez pytania o uprawnienia: zaznaczony tekst i execCommand w kliknięciu (lotnik/konto.js:
 * copyText; navigator.clipboard potrafi pytać o zgodę, gdy strona traci fokus).
 */
function copyText(text: string): boolean {
  const t = document.createElement("textarea");
  t.value = text;
  t.setAttribute("readonly", "");
  t.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
  document.body.appendChild(t);
  t.select();
  let ok = false;
  try {
    // Jedyna droga bez pytania o zgodę (jak w Lotniku).
    // oxlint-disable-next-line typescript/no-deprecated
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  t.remove();
  return ok;
}

/**
 * Ramka konta niezweryfikowanego, przeniesiona z Lotnika (lotnik/konto.js: showAccount): duży kod LOT-xxxx (klik
 * kopiuje), „Zweryfikuj” kopiuje kod i otwiera temat licznika na forum; potem „Weryfikacja w toku”, po 6 godzinach
 * z podpowiedzią. Stan kliknięcia jest wspólny z Lotnikiem (ten sam klucz w pamięci przeglądarki).
 */
export function VerifyBox({ konto }: { konto: Konto & { kod: string } }) {
  const [state, setState] = useState(() => {
    const v = verifyState(konto.id);
    if (v.seen !== true) setVerifyState(konto.id, { seen: true, at: 0 });
    return v;
  });
  const [message, setMessage] = useState("");
  // Chwila pokazania ramki: podpowiedź po 6 godzinach zmienia się przy następnym wejściu na stronę.
  const [shownAt] = useState(() => Date.now());
  const copy = () => {
    setMessage(copyText(konto.kod) ? T.copied(konto.kod) : T.copyFailed(konto.kod));
  };
  // Kopia przed otwarciem tematu: nowa karta zabiera stronie fokus.
  const verify = () => {
    copy();
    window.open(VERIFY_URL, "_blank", "noopener");
    if (!((state.at ?? 0) > 0)) {
      const next = { seen: true, at: Date.now() };
      setVerifyState(konto.id, next);
      setState(next);
    }
  };
  const at = state.at ?? 0;
  if (at > 0) {
    return (
      <section className="d2-verify">
        <p className="d2-verify-wait">{T.verifyPending}</p>
        <p className="note">{shownAt - at > SLOW_MS ? T.verifySlow : T.verifyPendingHow}</p>
        <p className="note d2-verify-line">
          {T.codeLabel}{" "}
          <button type="button" className="d2-verify-chip" onClick={copy} title={T.copyHint}>
            {konto.kod}
          </button>{" "}
          <button type="button" className="d2-link" onClick={verify}>
            {T.verifyAgain}
          </button>
        </p>
        {message && (
          <p className="note" role="status">
            {message}
          </p>
        )}
      </section>
    );
  }
  return (
    <section className="d2-verify">
      <p className="d2-verify-head">{T.unverified}</p>
      <p className="note">{T.unverifiedWhy}</p>
      <button type="button" className="d2-verify-code" onClick={copy} title={T.copyHint}>
        {konto.kod}
      </button>
      <p className="note d2-verify-hint">{T.copyHint}</p>
      <p className="note">{T.verifyHow}</p>
      {message && (
        <p className="note" role="status">
          {message}
        </p>
      )}
      <p className="d2-verify-head">{T.sameNick}</p>
      <button type="button" className="pixel-button" onClick={verify}>
        {T.verify}
      </button>
      <p className="note d2-fine">{T.verifyMore}</p>
    </section>
  );
}

/** Jedno zielone potwierdzenie po weryfikacji, gdy to urządzenie widziało konto niezweryfikowane (jak w Lotniku). */
export function VerifiedOnce({ id }: { id: string }) {
  const [show] = useState(() => {
    const v = verifyState(id);
    if (v.seen !== true || v.ok === true) return false;
    setVerifyState(id, { ...v, ok: true });
    return true;
  });
  if (!show) return null;
  return (
    <section className="d2-verify d2-verify-ok" role="status">
      <p className="d2-result">{T.verified}</p>
      <p className="note">{T.verifiedWhy}</p>
    </section>
  );
}
