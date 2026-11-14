import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../ui/fonts.css";
import "../ui/app.css";
import "./d2jsp.css";
import { webFontsReady } from "../ui/web-fonts";
import { D2jspApp } from "./d2jsp-app";

/** Gra w oknie strony licznika d2jsp: tylko „Skocznie dnia” i ustawienia (docs/zasady_d2jsp.md). */
const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

// Ta wersja nie działa offline: service worker gry z innej wizyty pod tym adresem zostaje wyrejestrowany.
// oxlint-disable-next-line typescript/no-unnecessary-condition -- bez HTTPS i w części WebView go nie ma
void navigator.serviceWorker
  ?.getRegistrations()
  .then((all) => all.filter((r) => r.scope.includes("/telemark/")).forEach((r) => void r.unregister()))
  .catch(() => undefined);

void webFontsReady(document.fonts).then(() => {
  createRoot(root).render(
    <StrictMode>
      <D2jspApp />
    </StrictMode>,
  );
});
