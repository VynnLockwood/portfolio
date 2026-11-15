"use client";
import { useEffect, useState } from "react";

const SHOW_MS = 3000;

/** The greeting. Fades out after about 3 s or on the first key press or pointer press. */
export function Welcome() {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const end = () => setDone(true);
    const h = setTimeout(end, SHOW_MS);
    window.addEventListener("keydown", end, { once: true });
    window.addEventListener("pointerdown", end, { once: true });
    return () => {
      clearTimeout(h);
      window.removeEventListener("keydown", end);
      window.removeEventListener("pointerdown", end);
    };
  }, []);
  return (
    <div className="welcome" data-testid="welcome" data-state={done ? "done" : "shown"} aria-hidden={done}>
      <h1>Welcome to my universe</h1>
      <p>hope you enjoy the exploring</p>
    </div>
  );
}
