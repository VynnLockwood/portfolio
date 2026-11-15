import { afterEach, describe, expect, it, vi } from "vitest";
import { hasWebGL, INITIAL_VIEW } from "./view";

afterEach(() => vi.restoreAllMocks());

describe("first view", () => {
  it("is always the list: wide or narrow, with or without WebGL, any motion setting", () => {
    expect(INITIAL_VIEW).toBe("list");
  });
});

describe("hasWebGL", () => {
  it("is false when the browser gives no WebGL context", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    expect(hasWebGL()).toBe(false);
  });
  it("is true when a context is available", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({} as RenderingContext);
    expect(hasWebGL()).toBe(true);
  });
  it("is false when asking for a context throws", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => { throw new Error("blocked"); });
    expect(hasWebGL()).toBe(false);
  });
});
