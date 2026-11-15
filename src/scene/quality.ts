export type Tier = "high" | "medium" | "low";
export interface TierSpec { nebulaOctaves: number; stars: number; dust: number; bloom: "full" | "half" | "off"; dof: boolean; grain: boolean }

export const TIERS: Record<Tier, TierSpec> = {
  high: { nebulaOctaves: 6, stars: 17100, dust: 250, bloom: "full", dof: true, grain: true },
  medium: { nebulaOctaves: 5, stars: 8000, dust: 100, bloom: "half", dof: false, grain: false },
  low: { nebulaOctaves: 3, stars: 3000, dust: 0, bloom: "off", dof: false, grain: false },
};

/** Far shell / mid field / bright few. High is 14000 / 3000 / 100; other tiers scale proportionally. */
export function starCounts(t: Tier): { far: number; mid: number; bright: number } {
  const total = TIERS[t].stars;
  if (t === "high") return { far: 14000, mid: 3000, bright: 100 };
  const bright = Math.max(10, Math.round((100 * total) / 17100));
  const mid = Math.round(((total - bright) * 3000) / 17000);
  return { far: total - bright - mid, mid, bright };
}

/** Tier from average fps measured in the first 3 seconds. */
export function pickTier(avgFps: number): Tier {
  return avgFps >= 55 ? "high" : avgFps >= 35 ? "medium" : "low";
}

/** Canvas pixel-ratio range. High and medium render at least 1920 pixels across when the window is narrower, so the sky and nebula stay sharp (FHD). */
export function renderDpr(cssWidth: number, tier: Tier): [number, number] {
  if (tier === "low" || !(cssWidth > 0)) return [1, 2];
  return [Math.min(2, Math.max(1, 1920 / cssWidth)), 2];
}
