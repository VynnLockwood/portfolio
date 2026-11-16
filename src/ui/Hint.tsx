"use client";
import { useEffect, useRef, useState } from "react";

export const HINT_TEXT = "#C9D3F5";
export const HINT_BG = "#080A1E";

const SHOW_AT_MS = 3400; // right after the greeting fades
const HIDE_AT_MS = 12000;
const DRAG_PX = 6;

/** "Scroll to zoom, drag to spin" line at the bottom of the 3D view. Appears after the greeting, leaves on first use or after 12 s. */
export function Hint() {
  const [state, setState] = useState<"hidden" | "shown" | "gone">("hidden");
  const [coarse] = useState(() => typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches === true);
  const down = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const gone = () => setState("gone");
    const show = setTimeout(() => setState((s) => (s === "hidden" ? "shown" : s)), SHOW_AT_MS);
    const hide = setTimeout(gone, HIDE_AT_MS);
    const onDown = (e: PointerEvent) => { down.current = { x: e.clientX, y: e.clientY }; };
    const onMove = (e: PointerEvent) => {
      const d = down.current;
      if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > DRAG_PX) gone();
    };
    const onUp = () => { down.current = null; };
    window.addEventListener("wheel", gone, { passive: true });
    window.addEventListener("touchmove", gone, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      clearTimeout(show); clearTimeout(hide);
      window.removeEventListener("wheel", gone);
      window.removeEventListener("touchmove", gone);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <div className="hint" data-testid="hint" data-state={state} aria-hidden="true">
      {coarse ? "Pinch to zoom · Drag to spin · Tap a world to open it" : "Scroll to zoom · Drag to spin · Click a world to open it"}
    </div>
  );
}
