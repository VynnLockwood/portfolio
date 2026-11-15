import { describe, expect, it } from "vitest";
import { frameExtent } from "./framing";

describe("frameExtent", () => {
  it("frames tight on wide screens, looser on square ones, loosest on tall ones", () => {
    expect(frameExtent(16 / 9)).toBe(62);
    expect(frameExtent(1)).toBeGreaterThan(frameExtent(16 / 9));
    expect(frameExtent(0.6)).toBe(105);
  });
  it("never goes outside 62..105 and is steady for odd input", () => {
    for (const a of [0.1, 0.8, 1.2, 1.6, 3, 10, NaN, Infinity]) {
      const e = frameExtent(a);
      expect(e).toBeGreaterThanOrEqual(62);
      expect(e).toBeLessThanOrEqual(105);
    }
  });
});
