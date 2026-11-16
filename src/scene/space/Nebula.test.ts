import { BackSide } from "three";
import { describe, expect, it, vi } from "vitest";
import { createNebulaAssets } from "./Nebula";

describe("sky dome", () => {
  it("is drawn behind everything without touching depth, and is never culled", () => {
    const a = createNebulaAssets(6);
    expect(a.mat.side).toBe(BackSide);
    expect(a.mat.depthTest).toBe(false);
    expect(a.mat.depthWrite).toBe(false);
    expect(a.mesh.renderOrder).toBeLessThan(0);
    expect(a.mesh.frustumCulled).toBe(false);
    a.dispose();
  });
  it("octave count comes from the tier through shader defines", () => {
    const hi = createNebulaAssets(6), lo = createNebulaAssets(4);
    expect(hi.mat.defines!.RIDGE_OCT).toBe(6);
    expect(lo.mat.defines!.RIDGE_OCT).toBe(4);
    expect(lo.mat.defines!.FBM_OCT).toBeLessThan(hi.mat.defines!.FBM_OCT as number);
    hi.dispose(); lo.dispose();
  });
  it("dispose frees geometry and material once", () => {
    const a = createNebulaAssets(5);
    const spies = [a.geo, a.mat].map((o) => vi.spyOn(o, "dispose"));
    a.dispose();
    spies.forEach((s) => expect(s).toHaveBeenCalledTimes(1));
  });
});
