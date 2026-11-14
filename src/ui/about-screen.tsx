import { useRef } from "react";
import { UI_TEXT } from "../text/ui-text";
import { typeset } from "./typeset";
import { useEntryFocus } from "./use-entry-focus";

interface Props {
  onBack: () => void;
  /** Whether the heading takes the keyboard focus when the screen appears. */
  focusOnEntry: boolean;
  /** Sections after the game's own, from a fork's mode (d2jsp: whose fork and where its source is). */
  extra?: readonly { title: string; text: string }[];
}

const NO_EXTRA: NonNullable<Props["extra"]> = [];

/** What the game is, whose game it follows and who made both, opened from the main menu. */
export function AboutScreen({ onBack, focusOnEntry, extra = NO_EXTRA }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEntryFocus(headingRef, focusOnEntry);
  return (
    <main className="screen">
      <h1 className="screen-title" tabIndex={-1} ref={headingRef}>
        {UI_TEXT.about.title}
      </h1>
      <dl className="how-to">
        {[...UI_TEXT.about.sections, ...extra].map((section) => (
          <div key={section.title} className="how-to-step">
            <dt>{section.title}</dt>
            <dd>{typeset(section.text)}</dd>
          </div>
        ))}
      </dl>
      <div>
        <button type="button" className="pixel-button" onClick={onBack}>
          {UI_TEXT.back}
        </button>
      </div>
    </main>
  );
}
