import { create } from "zustand";
import type { Tier } from "../scene/quality";
import type { Role } from "../data/types";

export interface UniverseState {
  role: Role | null;
  view: "3d" | "list";
  hovered: string | null;
  tier: Tier | "auto";
  notice: string | null;
  /** true while the camera plays a fly-in */
  flying: boolean;
  setRole(r: Role | null): void;
  setView(v: "3d" | "list"): void;
  setHovered(id: string | null): void;
  setNotice(m: string | null): void;
  setFlying(f: boolean): void;
}

export const useUniverse = create<UniverseState>((set) => ({
  role: null,
  view: "list",
  hovered: null,
  tier: "auto",
  notice: null,
  flying: false,
  setRole: (role) => set({ role }),
  setView: (view) => set({ view }),
  setHovered: (hovered) => set({ hovered }),
  setNotice: (notice) => set({ notice }),
  setFlying: (flying) => set({ flying }),
}));

export const FALLBACK_NOTICE = "3D could not start, showing the list instead.";

/** Used when WebGL or the WASM core fails: switch to the plain list and say why in one line. */
export function fallbackToList(): void {
  const s = useUniverse.getState();
  s.setNotice(FALLBACK_NOTICE);
  s.setView("list");
}
