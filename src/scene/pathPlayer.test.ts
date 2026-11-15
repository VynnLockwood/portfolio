import { describe, expect, it } from "vitest";
import { clampDt, PathPlayer } from "./pathPlayer";

/** 11 poses; position x goes 0..100, everything else 0. */
const line = () => {
  const p = new Float32Array(11 * 6);
  for (let i = 0; i < 11; i++) p[i * 6] = i * 10;
  return p;
};
const out = () => new Float32Array(6);

describe("PathPlayer", () => {
  it("starts at the first pose and finishes at the last, returning false when done", () => {
    const pl = new PathPlayer();
    const o = out();
    pl.start(line(), 1000, 0);
    expect(pl.sample(0, o)).toBe(true);
    expect(o[0]).toBe(0);
    let t = 0;
    let playing = true;
    while (playing && t < 5000) { t += 16; playing = pl.sample(t, o); }
    expect(playing).toBe(false);
    expect(o[0]).toBe(100);
    expect(pl.active).toBe(false);
  });

  it("moves forward monotonically", () => {
    const pl = new PathPlayer();
    const o = out();
    pl.start(line(), 1000, 0);
    let last = -1;
    for (let i = 1; i <= 10; i++) {
      pl.sample(i * 40, o);
      expect(o[0]).toBeGreaterThan(last);
      last = o[0];
    }
  });

  it("cancel returns the progress reached and stops playback", () => {
    const pl = new PathPlayer();
    const o = out();
    pl.start(line(), 1000, 0);
    for (let t = 0; t <= 500; t += 25) pl.sample(t, o);
    expect(pl.cancel()).toBeCloseTo(0.5, 1);
    expect(pl.active).toBe(false);
    expect(pl.sample(600, o)).toBe(false);
  });

  it("a long gap (tab hidden 60 s) advances by at most one clamped step, no teleport", () => {
    const pl = new PathPlayer();
    const o = out();
    pl.start(line(), 2000, 0);
    pl.sample(16, o);
    pl.sample(60_016, o);
    expect(o[0]).toBeLessThan(100 * (16 + 50 + 1) / 2000 + 0.01);
    expect(pl.active).toBe(true);
  });
});

describe("clampDt", () => {
  it("caps a frame step at 50 ms", () => {
    expect(clampDt(5000)).toBe(50);
    expect(clampDt(16)).toBe(16);
    expect(clampDt(-3)).toBe(0);
  });
});
