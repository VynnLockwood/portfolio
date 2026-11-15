"use client";
import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/** True when the visitor asked the OS for less motion. Updates if they change it while the page is open. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    setReduced(mq.matches);
    const on = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

export interface ViewEnv {
  webgl: boolean;
  width: number;
  reducedMotion: boolean;
}

/** List view for no-WebGL, very small screens (< 480 px) and reduced-motion visitors; 3D otherwise. */
export function chooseInitialView(env: ViewEnv): "3d" | "list" {
  return !env.webgl || env.width < 480 || env.reducedMotion ? "list" : "3d";
}

export function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
