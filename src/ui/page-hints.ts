import { TITLE_AT_PX, VIEW_HEIGHT_PX, pageHintsBottomPx } from "../render/jump-view";

/**
 * Shows the lines the picture leaves to the page (the hints on the gate on the d2jsp page, Mateusz 14.11: in a
 * plain readable font, not the picture's big letters) over the picture's bottom left corner, lined up with the
 * hill's name and as far over the bar as the drawn lines. Returns what to call after each frame; it touches the
 * page only when the lines or the picture's place change.
 */
export function pageHintsUpdater(element: HTMLElement, canvas: HTMLCanvasElement): (lines: readonly string[]) => void {
  // The updater owns this element from now on: the screen only places it.
  const box = element;
  let shown = "";
  return (lines) => {
    const scale = canvas.clientHeight / VIEW_HEIGHT_PX;
    const left = canvas.offsetLeft + TITLE_AT_PX.x * scale;
    const bottomOfLines = canvas.offsetTop + pageHintsBottomPx() * scale;
    // The stage holds both the picture and this element (a hidden element has no offsetParent).
    const parentHeight = box.parentElement?.clientHeight ?? 0;
    const key = `${lines.join("\n")}|${Math.round(left)}|${Math.round(parentHeight - bottomOfLines)}|${scale}`;
    if (key === shown) return;
    shown = key;
    box.hidden = lines.length === 0;
    box.style.left = `${Math.round(left)}px`;
    box.style.bottom = `${Math.round(parentHeight - bottomOfLines)}px`;
    // The size follows the picture, as its own letters do (CSS: --picture-px, one pixel of the picture).
    box.style.setProperty("--picture-px", `${scale}px`);
    box.replaceChildren(
      ...lines.map((line) => {
        const row = document.createElement("div");
        row.textContent = sentenceCase(line);
        return row;
      }),
    );
  };
}

/**
 * The picture's font has only capitals; the page writes the line as a sentence. The touch fields' names L and P
 * stay capitals ("L+P NA PROGU" → "L+P na progu").
 */
export function sentenceCase(line: string): string {
  const lower = line.toLocaleLowerCase("pl").replace(/(?<![\p{L}])([lp])(?![\p{L}])/gu, (c) => c.toUpperCase());
  return lower.charAt(0).toLocaleUpperCase("pl") + lower.slice(1);
}
