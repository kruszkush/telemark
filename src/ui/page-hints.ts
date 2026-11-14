import { TITLE_AT_PX, VIEW_HEIGHT_PX, pageHintsBottomPx } from "../render/jump-view";
import type { HintGroup } from "../render/jump-view-hud";

/**
 * Shows the hints the picture leaves to the page (the d2jsp page on the gate, Mateusz 14.11: a plain readable
 * font, not the picture's big letters; two groups, start and flight above the landing, in see-through boxes)
 * over the picture's bottom left corner, lined up with the hill's name and as far over the bar as the drawn
 * lines. Returns what to call after each frame; it touches the page only when the hints or the picture's place
 * change.
 */
export function pageHintsUpdater(
  element: HTMLElement,
  canvas: HTMLCanvasElement,
): (groups: readonly HintGroup[]) => void {
  // The updater owns this element from now on: the screen only places it.
  const box = element;
  let shown = "";
  return (groups) => {
    const scale = canvas.clientHeight / VIEW_HEIGHT_PX;
    const left = Math.round(canvas.offsetLeft + TITLE_AT_PX.x * scale);
    // The stage holds both the picture and this element (a hidden element has no offsetParent).
    const parentHeight = box.parentElement?.clientHeight ?? 0;
    const bottom = Math.round(parentHeight - (canvas.offsetTop + pageHintsBottomPx() * scale));
    const key = `${JSON.stringify(groups)}|${left}|${bottom}|${scale}`;
    if (key === shown) return;
    shown = key;
    box.hidden = groups.length === 0;
    box.style.left = `${left}px`;
    box.style.bottom = `${bottom}px`;
    // The size follows the picture, as its own letters do (CSS: --picture-px, one pixel of the picture).
    box.style.setProperty("--picture-px", `${scale}px`);
    box.replaceChildren(...groups.map(groupElement));
  };
}

function groupElement(group: HintGroup): HTMLElement {
  const section = document.createElement("section");
  const title = document.createElement("h3");
  title.textContent = sentenceCase(group.title);
  section.append(
    title,
    ...group.lines.map((line) => {
      const row = document.createElement("div");
      row.textContent = sentenceCase(line);
      return row;
    }),
  );
  return section;
}

/**
 * The picture's font has only capitals; the page writes the line as a sentence. The touch fields' names L and P
 * stay capitals ("L+P NA PROGU" → "L+P na progu").
 */
export function sentenceCase(line: string): string {
  const lower = line.toLocaleLowerCase("pl").replace(/(?<![\p{L}])([lp])(?![\p{L}])/gu, (c) => c.toUpperCase());
  return lower.charAt(0).toLocaleUpperCase("pl") + lower.slice(1);
}
