import { describe, expect, it } from "vitest";
import { chooseInitialView } from "./view";

const env = { webgl: true, width: 1280, reducedMotion: false };

describe("chooseInitialView", () => {
  it("3d on a normal desktop with WebGL", () => expect(chooseInitialView(env)).toBe("3d"));
  it("list below 480 px wide", () => expect(chooseInitialView({ ...env, width: 479 })).toBe("list"));
  it("3d at exactly 480 px", () => expect(chooseInitialView({ ...env, width: 480 })).toBe("3d"));
  it("list without WebGL", () => expect(chooseInitialView({ ...env, webgl: false })).toBe("list"));
  it("list when the visitor prefers reduced motion", () => expect(chooseInitialView({ ...env, reducedMotion: true })).toBe("list"));
});
