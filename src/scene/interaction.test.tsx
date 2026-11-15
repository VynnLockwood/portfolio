import { act, render } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@react-three/fiber", async (orig) => {
  const real = await orig<typeof import("@react-three/fiber")>();
  return { ...real, Canvas: (_p: ComponentProps<typeof real.Canvas>) => null };
});

import * as wasm from "@wasm/universe_core.js";
import { createCoreApi, type WasmModule } from "../engine/coreApi";
import { disposeCore, setCore, workerStats } from "../engine/coreClient";
import { activateRepo, LatestWins, openRepo, Picker } from "./interaction";
import Universe from "./Universe";

afterEach(async () => {
  vi.restoreAllMocks();
  await disposeCore();
});

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

describe("openRepo", () => {
  it("opens the url in a new tab without an opener", () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    openRepo("https://github.com/VynnLockwood/kuronuma");
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith("https://github.com/VynnLockwood/kuronuma", "_blank", "noopener");
  });
});

describe("activateRepo", () => {
  it("opens the repo first and in the same synchronous turn, then flies toward it", () => {
    const calls: string[] = [];
    vi.spyOn(window, "open").mockImplementation(() => { calls.push("open"); return null; });
    activateRepo(1, () => calls.push("fly"));
    expect(calls).toEqual(["open", "fly"]); // nothing awaited in between, so the browser keeps the user gesture
  });
  it("opens the repo with that rank's url", () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    activateRepo(0, () => {});
    expect(open).toHaveBeenCalledWith("https://github.com/VynnLockwood/project-singularity", "_blank", "noopener");
  });
});

describe("LatestWins", () => {
  it("three quick calls run the first and the last only", async () => {
    const ran: number[] = [];
    const got: number[] = [];
    const lw = new LatestWins(async (n: number) => { ran.push(n); await tick(10); return n * 2; }, (r) => got.push(r));
    lw.call(1); lw.call(2); lw.call(3);
    await tick(60);
    expect(ran).toEqual([1, 3]);
    expect(got).toEqual([2, 6]);
  });
});

describe("Picker", () => {
  it("reports the hit index of the latest ray", async () => {
    const hits: number[] = [];
    const core = createCoreApi(wasm as unknown as WasmModule);
    const p = new Picker(() => core, (i) => hits.push(i), () => ({ positions: new Float32Array([0, 0, 0]), radii: new Float32Array([1]) }));
    p.move(new Float32Array([0, 0, -10, 0, 0, 1]));
    await tick(10);
    expect(hits).toEqual([0]);
  });

  it("ignores a pick that resolves or rejects after dispose, with no unhandled rejection", async () => {
    const seen: unknown[] = [];
    const onRej = (e: unknown) => seen.push(e);
    process.on("unhandledRejection", onRej);
    const hits: number[] = [];
    const slowFail = { ...createCoreApi(wasm as unknown as WasmModule), pick: async () => { await tick(10); throw new Error("worker terminated"); } };
    const p = new Picker(() => slowFail, (i) => hits.push(i), () => ({ positions: new Float32Array([0, 0, 0]), radii: new Float32Array([1]) }));
    p.move(new Float32Array([0, 0, -10, 0, 0, 1]));
    p.dispose();
    await tick(40);
    process.off("unhandledRejection", onRej);
    expect(hits).toEqual([]);
    expect(seen).toEqual([]);
  });
});

describe("Universe teardown", () => {
  it("unmounting terminates the worker once and every worker made is terminated", async () => {
    const terminate = vi.fn();
    const core = createCoreApi(wasm as unknown as WasmModule);
    setCore(core, terminate);
    const { unmount } = render(<Universe />);
    await act(async () => { await tick(5); });
    unmount();
    await act(async () => { await tick(5); });
    expect(terminate).toHaveBeenCalledTimes(1);
    expect(workerStats.created).toBe(workerStats.terminated);
  });
});
