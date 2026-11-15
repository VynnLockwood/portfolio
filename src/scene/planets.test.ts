import { describe, expect, it } from "vitest";
import repos from "../data/repos.json";
import type { Repo } from "../data/types";
import { hasRing, planetKind, planetSeed } from "./planets";

const list = repos as Repo[];

describe("planet look", () => {
  it("kind follows the first role", () => {
    expect(planetKind(["backend", "data"])).toBe("rocky");
    expect(planetKind(["data"])).toBe("ocean");
    expect(planetKind(["fullstack", "data"])).toBe("gas");
    expect(planetKind(["ai", "backend"])).toBe("storm");
  });
  it("seed is stable and the 9 repos all get a different one, within 0..1000", () => {
    const seeds = list.map((r) => planetSeed(r.id));
    expect(list.map((r) => planetSeed(r.id))).toEqual(seeds);
    expect(new Set(seeds).size).toBe(list.length);
    for (const s of seeds) { expect(s).toBeGreaterThanOrEqual(0); expect(s).toBeLessThan(1000); }
  });
  it("only gas giants get a ring", () => {
    expect(hasRing("gas")).toBe(true);
    for (const k of ["rocky", "ocean", "storm"] as const) expect(hasRing(k)).toBe(false);
  });
});
