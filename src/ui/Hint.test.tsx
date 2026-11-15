import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contrastRatio } from "../data/roles";
import { Hint, HINT_BG, HINT_TEXT } from "./Hint";

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

const state = (c: HTMLElement) => c.querySelector("[data-testid=hint]")!.getAttribute("data-state");
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

describe("Hint", () => {
  it("is hidden at first, appears after the greeting, and says scroll and drag", () => {
    const { container } = render(<Hint />);
    advance(3000);
    expect(state(container)).toBe("hidden");
    advance(500);
    expect(state(container)).toBe("shown");
    expect(container.textContent).toContain("Scroll to zoom");
    expect(container.textContent).toContain("Drag to spin");
  });
  it("goes away on the first wheel and stays gone", () => {
    const { container } = render(<Hint />);
    advance(3500);
    act(() => void window.dispatchEvent(new Event("wheel")));
    expect(state(container)).toBe("gone");
    advance(5000);
    expect(state(container)).toBe("gone");
  });
  it("goes away after a real drag but not after a tiny wobble of the pointer", () => {
    const { container } = render(<Hint />);
    advance(3500);
    act(() => void window.dispatchEvent(new MouseEvent("pointerdown", { clientX: 100, clientY: 100 })));
    act(() => void window.dispatchEvent(new MouseEvent("pointermove", { clientX: 102, clientY: 101 })));
    expect(state(container)).toBe("shown");
    act(() => void window.dispatchEvent(new MouseEvent("pointermove", { clientX: 160, clientY: 100 })));
    expect(state(container)).toBe("gone");
  });
  it("goes away by itself after 12 seconds", () => {
    const { container } = render(<Hint />);
    advance(12100);
    expect(state(container)).toBe("gone");
  });
  it("uses touch wording on a coarse pointer", () => {
    vi.spyOn(window, "matchMedia").mockImplementation((q: string) => ({ matches: q.includes("coarse"), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false }) as MediaQueryList);
    const { container } = render(<Hint />);
    expect(container.textContent).toContain("Pinch to zoom");
    expect(container.textContent).toContain("Tap a world");
  });
  it("never blocks the canvas and is hidden from screen readers, and its text is readable", () => {
    const { container } = render(<Hint />);
    const el = container.querySelector("[data-testid=hint]")!;
    expect(el.className).toContain("hint");
    expect(el.getAttribute("aria-hidden")).toBe("true");
    expect(contrastRatio(HINT_TEXT, HINT_BG)).toBeGreaterThanOrEqual(4.5);
  });
});
