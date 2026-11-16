import { TextureLoader } from "three";
import { describe, expect, it, vi } from "vitest";
import { createSunAssets, SUN_RADIUS } from "./Sun";

describe("sun assets", () => {
  it("does not load the logo or any texture (the logo lives in the header)", () => {
    const load = vi.spyOn(TextureLoader.prototype, "load");
    const a = createSunAssets();
    expect(load).not.toHaveBeenCalled();
    a.dispose();
    load.mockRestore();
  });
  it("sun and corona both animate from uTime, and the sphere is smooth", () => {
    const a = createSunAssets();
    expect(a.sphereMat.uniforms.uTime).toBeDefined();
    expect(a.coronaMat.uniforms.uTime).toBeDefined();
    expect(a.sphereGeo.parameters.widthSegments).toBeGreaterThanOrEqual(64);
    expect(a.sphereGeo.parameters.radius).toBe(SUN_RADIUS);
    a.dispose();
  });
  it("the corona is additive and does not write depth, so it glows without hiding planets", () => {
    const a = createSunAssets();
    expect(a.coronaMat.depthWrite).toBe(false);
    expect(a.coronaMat.transparent).toBe(true);
    a.dispose();
  });
  it("dispose frees both geometries and both materials once", () => {
    const a = createSunAssets();
    const spies = [a.sphereGeo, a.coronaGeo, a.sphereMat, a.coronaMat].map((o) => vi.spyOn(o, "dispose"));
    a.dispose();
    spies.forEach((s) => expect(s).toHaveBeenCalledTimes(1));
  });
});
