import { describe, expect, it } from "vitest";
import { pickTier, renderDpr, starCounts, tierFromQuery, TIERS } from "./quality";

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
  it("the sky keeps more detail on faster tiers", () => {
    expect(TIERS.high.nebulaOctaves).toBeGreaterThan(TIERS.medium.nebulaOctaves);
    expect(TIERS.medium.nebulaOctaves).toBeGreaterThan(TIERS.low.nebulaOctaves);
  });
  it("render scale keeps at least 1920 pixels across on high and medium, never above 2", () => {
    expect(renderDpr(1280, "high")).toEqual([1.5, 2]);
    expect(renderDpr(1280, "medium")).toEqual([1.5, 2]);
    expect(renderDpr(2560, "high")).toEqual([1, 2]);
    expect(renderDpr(800, "high")).toEqual([2, 2]);
    expect(renderDpr(1280, "low")).toEqual([1, 2]);
    expect(renderDpr(0, "high")).toEqual([1, 2]);
  });
});

describe("tierFromQuery", () => {
  it("reads ?tier= only when it names a tier", () => {
    expect(tierFromQuery("?e2e=1&tier=high")).toBe("high");
    expect(tierFromQuery("?tier=medium")).toBe("medium");
    expect(tierFromQuery("?tier=ultra")).toBeNull();
    expect(tierFromQuery("")).toBeNull();
  });
});
