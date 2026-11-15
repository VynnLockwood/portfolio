import type { Role } from "../data/types";

export type PlanetKind = "rocky" | "ocean" | "gas" | "storm";

const KIND: Record<Role, PlanetKind> = { backend: "rocky", data: "ocean", fullstack: "gas", ai: "storm" };

/** Planet surface follows the first role of the repo. */
export const planetKind = (roles: Role[]): PlanetKind => KIND[roles[0]];

/** Stable per-repo number in 0..1000, so each planet keeps its own look between visits. */
export function planetSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) % 100000) / 100;
}

/** Only gas giants wear a ring. */
export const hasRing = (kind: PlanetKind): boolean => kind === "gas";
