const q = typeof location !== "undefined" ? new URLSearchParams(location.search) : new URLSearchParams();
/** `?e2e=1` freezes twinkle and idle motion, fixes the quality tier, and exposes `window.__universe`. */
export const E2E = q.has("e2e");

export const perf = { fps: 60 };

export interface UniverseHook {
  [k: string]: unknown;
}
export const hook: UniverseHook = {};
if (E2E && typeof window !== "undefined") (window as unknown as { __universe: UniverseHook }).__universe = hook;
