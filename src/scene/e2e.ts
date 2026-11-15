import { tierFromQuery, type Tier } from "./quality";

const q = typeof location !== "undefined" ? new URLSearchParams(location.search) : new URLSearchParams();
/** `?e2e=1` freezes twinkle and idle motion, fixes the quality tier, and exposes `window.__universe`. */
export const E2E = q.has("e2e");

/** `?e2e=1&tier=high|medium|low` overrides the fixed `low` tier used in tests. */
export const E2E_TIER: Tier | null = E2E && typeof location !== "undefined" ? tierFromQuery(location.search) : null;

export const perf = { fps: 60 };

export interface UniverseHook {
  [k: string]: unknown;
}
export const hook: UniverseHook = {};
if (E2E && typeof window !== "undefined") (window as unknown as { __universe: UniverseHook }).__universe = hook;
