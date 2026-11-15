import { describe, expect, it, vi } from "vitest";
import * as wasm from "@wasm/universe_core.js";
import { createCoreApi, type WasmModule } from "./coreApi";
import { disposeCore, getCore, setCore, workerStats } from "./coreClient";

const bodies = [
  { weight: 1, roles: 3 },
  { weight: 0.9, roles: 1 },
  { weight: 0.8, roles: 4 },
];
const api = () => createCoreApi(wasm as unknown as WasmModule);

describe("createCoreApi", () => {
  it("replacing a layout frees the old one", async () => {
    const core = api();
    await core.layoutNew(bodies, 1);
    await core.layoutNew(bodies, 2);
    expect(await core.debugLive()).toBe(1);
  });

  it("layoutFree frees the layout", async () => {
    const core = api();
    await core.layoutNew(bodies, 1);
    await core.layoutFree();
    expect(await core.debugLive()).toBe(0);
  });

  it("steps a layout and returns 3 floats per body", async () => {
    const core = api();
    await core.layoutNew(bodies, 1);
    const pos = await core.layoutStep(3);
    expect(pos).toBeInstanceOf(Float32Array);
    expect(pos.length).toBe(9);
  });

  it("a step that arrives after layoutFree resolves empty, does not throw", async () => {
    const core = api();
    await core.layoutNew(bodies, 1);
    await core.layoutFree();
    expect((await core.layoutStep(3)).length).toBe(0);
    expect(await core.layoutSettled()).toBe(true);
  });

  it("starLayer copies the arrays out and frees the wasm object", async () => {
    const core = api();
    const s = await core.starLayer(0, 10, 1);
    expect(s.positions.length).toBe(30);
    expect(s.sizes.length).toBe(10);
    expect(s.phases.length).toBe(10);
    expect(s.freqs.length).toBe(10);
    expect(s.mags.length).toBe(10);
    expect(s.colors.length).toBe(30);
    expect(await core.debugLive()).toBe(0);
  });

  it("pick, camera path and poses go through to wasm", async () => {
    const core = api();
    expect(await core.pick(new Float32Array([0, 0, 0]), new Float32Array([1]), new Float32Array([0, 0, -10, 0, 0, 1]))).toBe(0);
    const from = new Float32Array([0, 0, 100, 0, 0, 0]);
    const to = new Float32Array([50, 20, 0, 10, 0, 0]);
    const path = await core.cameraPath(from, to, 10, true);
    expect(path.length).toBe(60);
    expect(Array.from(path.slice(0, 6))).toEqual(Array.from(from));
    expect((await core.flyTowardPose(new Float32Array([0, 0, 0]), 2, new Float32Array([0, 0, 50]))).length).toBe(6);
    expect((await core.framePose(new Float32Array([1, 2, 3]), 55)).length).toBe(6);
  });
});

describe("coreClient", () => {
  it("disposeCore frees the layout, terminates once, and a second call is a no-op", async () => {
    const terminate = vi.fn();
    const fake = { ...api() };
    const free = vi.spyOn(fake, "layoutFree");
    setCore(fake, terminate);
    expect(getCore()).toBe(fake);
    await disposeCore();
    await disposeCore();
    expect(free).toHaveBeenCalledTimes(1);
    expect(terminate).toHaveBeenCalledTimes(1);
    expect(workerStats.created - workerStats.terminated).toBe(0);
  });

  it("disposeCore swallows a rejected layoutFree and still terminates", async () => {
    const terminate = vi.fn();
    const fake = { ...api(), layoutFree: () => Promise.reject(new Error("worker gone")) };
    setCore(fake, terminate);
    await expect(disposeCore()).resolves.toBeUndefined();
    expect(terminate).toHaveBeenCalledTimes(1);
  });
});
