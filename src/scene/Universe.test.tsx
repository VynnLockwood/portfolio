import { act, render } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const canvas = { props: [] as Record<string, unknown>[], unmounts: 0, glDom: null as HTMLCanvasElement | null };

vi.mock("@react-three/fiber", async (orig) => {
  const React = await import("react");
  const real = await orig<typeof import("@react-three/fiber")>();
  return {
    ...real,
    Canvas: (p: ComponentProps<typeof real.Canvas>) => {
      canvas.props.push(p as Record<string, unknown>);
      React.useEffect(() => {
        const el = document.createElement("canvas");
        canvas.glDom = el;
        (p.onCreated as ((s: unknown) => void) | undefined)?.({ gl: { domElement: el } });
        return () => void canvas.unmounts++;
      }, []);
      return null;
    },
  };
});

import { createCoreApi, type WasmModule } from "../engine/coreApi";
import { disposeCore, setCore } from "../engine/coreClient";
import { useUniverse } from "../store/useUniverse";
import * as wasm from "@wasm/universe_core.js";
import Universe from "./Universe";

const healthy = () => createCoreApi(wasm as unknown as WasmModule);

beforeEach(() => {
  canvas.props = [];
  canvas.unmounts = 0;
  useUniverse.setState({ view: "3d", notice: null, role: null });
});
afterEach(async () => {
  await disposeCore();
});

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

describe("Universe", () => {
  it("falls back to the list with a notice when the core cannot start", async () => {
    setCore({ ...healthy(), debugLive: () => Promise.reject(new Error("wasm failed to load")) }, () => {});
    render(<Universe />);
    await flush();
    expect(useUniverse.getState().view).toBe("list");
    expect(useUniverse.getState().notice).toBe("3D could not start, showing the list instead.");
  });

  it("falls back to the list when WebGL context is lost", async () => {
    setCore(healthy(), () => {});
    render(<Universe />);
    await flush();
    expect(useUniverse.getState().view).toBe("3d");
    act(() => void canvas.glDom!.dispatchEvent(new Event("webglcontextlost", { cancelable: true })));
    expect(useUniverse.getState().view).toBe("list");
    expect(useUniverse.getState().notice).toContain("showing the list instead");
  });

  it("ignores a context-lost event from an old canvas after unmount (quick list/3D toggle)", async () => {
    setCore(healthy(), () => {});
    const { unmount } = render(<Universe />);
    await flush();
    const oldGl = canvas.glDom!;
    unmount();
    useUniverse.setState({ view: "3d", notice: null });
    oldGl.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
    expect(useUniverse.getState().view).toBe("3d");
    expect(useUniverse.getState().notice).toBeNull();
  });

  it("keeps at least 1920 px across, follows the window width, and never remounts the canvas", async () => {
    setCore(healthy(), () => {});
    Object.defineProperty(window, "innerWidth", { value: 1280, configurable: true });
    render(<Universe />);
    await flush();
    expect(canvas.props.at(-1)!.dpr).toEqual([1.5, 2]);
    Object.defineProperty(window, "devicePixelRatio", { value: 3, configurable: true });
    Object.defineProperty(window, "innerWidth", { value: 2560, configurable: true });
    act(() => void window.dispatchEvent(new Event("resize")));
    expect(canvas.props.at(-1)!.dpr).toEqual([1, 2]);
    expect(canvas.unmounts).toBe(0);
  });

  it("stops the render loop while the tab is hidden and resumes after", async () => {
    setCore(healthy(), () => {});
    render(<Universe />);
    await flush();
    expect(canvas.props.at(-1)!.frameloop).toBe("always");
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    act(() => void document.dispatchEvent(new Event("visibilitychange")));
    expect(canvas.props.at(-1)!.frameloop).toBe("never");
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    act(() => void document.dispatchEvent(new Event("visibilitychange")));
    expect(canvas.props.at(-1)!.frameloop).toBe("always");
  });
});
