import { describe, expect, it } from "vitest";
import { pickTier, starCounts, TIERS } from "./quality";

describe("quality tiers", () => {
  it("high tier star counts are 14000 / 3000 / 100", () => {
    expect(starCounts("high")).toEqual({ far: 14000, mid: 3000, bright: 100 });
  });
  it("lower tiers add up to their total and keep at least 10 bright stars", () => {
    for (const t of ["medium", "low"] as const) {
      const c = starCounts(t);
      expect(c.far + c.mid + c.bright).toBe(TIERS[t].stars);
      expect(c.bright).toBeGreaterThanOrEqual(10);
    }
  });
  it("picks a tier from measured fps", () => {
    expect(pickTier(60)).toBe("high");
    expect(pickTier(40)).toBe("medium");
    expect(pickTier(10)).toBe("low");
  });
});
