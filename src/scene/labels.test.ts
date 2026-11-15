import { PerspectiveCamera, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "../data/roles";
import { declutter, LABEL_BG, LABEL_TEXT, projectLabel } from "./labels";

const W = 1600, H = 900;
function cam() {
  const c = new PerspectiveCamera(55, W / H, 0.1, 12000);
  c.position.set(0, 0, 100);
  c.lookAt(0, 0, 0);
  c.updateMatrixWorld();
  return c;
}
const out = () => ({ x: 0, y: 0, visible: false });

describe("projectLabel", () => {
  it("puts a body straight ahead at the screen centre, with the label just below it", () => {
    const o = out();
    projectLabel(o, new Vector3(0, 0, 0), cam(), W, H, 5);
    expect(o.visible).toBe(true);
    expect(o.x).toBeCloseTo(W / 2, 0);
    expect(o.y).toBeGreaterThan(H / 2); // below the centre, clear of the body
  });
  it("hides a body behind the camera", () => {
    const o = out();
    projectLabel(o, new Vector3(0, 0, 200), cam(), W, H, 5);
    expect(o.visible).toBe(false);
  });
  it("hides a body far off screen, and never produces NaN for odd input", () => {
    const o = out();
    projectLabel(o, new Vector3(100000, 0, 0), cam(), W, H, 5);
    expect(o.visible).toBe(false);
    projectLabel(o, new Vector3(Infinity, 0, 0), cam(), W, H, 5);
    expect(o.visible).toBe(false);
    projectLabel(o, new Vector3(NaN, 0, 0), cam(), W, H, 5);
    expect(o.visible).toBe(false);
    expect(Number.isFinite(o.x) && Number.isFinite(o.y)).toBe(true);
  });
  it("label text is readable on its pill (WCAG AA)", () => {
    expect(contrastRatio(LABEL_TEXT, LABEL_BG)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("declutter", () => {
  it("keeps the higher-priority label when two overlap, and hides the lower one", () => {
    const vis = [true, true, true];
    declutter([100, 110, 400], [100, 105, 100], [80, 80, 80], 22, vis);
    expect(vis).toEqual([true, false, true]);
  });
  it("leaves labels that only touch side by side, and ignores hidden ones when checking", () => {
    const vis = [true, true, true];
    declutter([100, 190, 100], [100, 100, 500], [80, 80, 80], 22, vis);
    expect(vis).toEqual([true, true, true]);
    const vis2 = [false, true];
    declutter([100, 105], [100, 100], [80, 80], 22, vis2);
    expect(vis2).toEqual([false, true]); // the first was already hidden, so it cannot push the second away
  });
});
