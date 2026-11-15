import { describe, expect, it, vi } from "vitest";
import repos from "../data/repos.json";
import type { Repo } from "../data/types";
import { bodyRadius, createPlanetAssets, liftFraction, LIFT, MIN_CAM_DISTANCE, PLANET_SEGMENTS } from "./Bodies";
import { hasRing, planetKind } from "./planets";

const list = repos as Repo[];

describe("planet assets", () => {
  it("each planet material carries the uniforms the shader reads, with the kind from its first role", () => {
    const a = createPlanetAssets(list);
    expect(a.mats).toHaveLength(list.length);
    a.mats.forEach((m, i) => {
      for (const u of ["uKind", "uSeed", "uTime", "uSpin", "uMix", "uHover", "uTint"]) expect(m.uniforms[u], u).toBeDefined();
      expect(["rocky", "ocean", "gas", "storm"][m.uniforms.uKind.value as number]).toBe(planetKind(list[i].roles));
    });
    a.dispose();
  });
  it("spheres are smooth enough to zoom close to (at least 64 x 48 segments)", () => {
    expect(PLANET_SEGMENTS.width).toBeGreaterThanOrEqual(64);
    expect(PLANET_SEGMENTS.height).toBeGreaterThanOrEqual(48);
  });
  it("only gas giants get a ring, and the ring follows the planet's index", () => {
    const a = createPlanetAssets(list);
    const expected = list.map((r, i) => (hasRing(planetKind(r.roles)) ? i : -1)).filter((i) => i >= 0);
    expect(a.rings.map((r) => r.index)).toEqual(expected);
    expect(expected.length).toBeGreaterThan(0);
    a.dispose();
  });
  it("dispose frees the sphere, ring geometry and every material", () => {
    const a = createPlanetAssets(list);
    const spies = [a.geo, a.ringGeo, ...a.mats, ...a.rings.map((r) => r.mat)].map((o) => vi.spyOn(o, "dispose"));
    a.dispose();
    spies.forEach((s) => expect(s).toHaveBeenCalledTimes(1));
  });
});

describe("close zoom", () => {
  it("the lift fades out when the camera is near, so a planet never moves into the lens", () => {
    expect(liftFraction(10, 6, 1)).toBe(0);
    expect(liftFraction(200, 6, 1)).toBeCloseTo(LIFT / 200, 6);
    expect(liftFraction(200, 6, 0)).toBe(0);
  });
  it("the nearest the camera can get still clears the biggest planet, even after the lift", () => {
    expect(MIN_CAM_DISTANCE - LIFT).toBeGreaterThan(bodyRadius(1) * 1.15);
  });
});
