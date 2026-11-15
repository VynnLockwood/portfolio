import * as Comlink from "comlink";

export interface StarLayerData {
  positions: Float32Array;
  sizes: Float32Array;
  phases: Float32Array;
  freqs: Float32Array;
  mags: Float32Array;
  colors: Float32Array;
}

export interface CoreApi {
  layoutNew(bodies: { weight: number; roles: number }[], seed: number): Promise<void>;
  layoutStep(n: number): Promise<Float32Array>;
  layoutSettled(): Promise<boolean>;
  layoutFree(): Promise<void>;
  starLayer(kind: 0 | 1 | 2, count: number, seed: number): Promise<StarLayerData>;
  pick(positions: Float32Array, radii: Float32Array, ray: Float32Array): Promise<number>;
  cameraPath(from: Float32Array, to: Float32Array, samples: number, arc: boolean): Promise<Float32Array>;
  flyTowardPose(body: Float32Array, radius: number, camera: Float32Array): Promise<Float32Array>;
  framePose(positions: Float32Array, fovDeg: number): Promise<Float32Array>;
  /** Number of wasm objects created and not yet freed (tests use this to check for leaks). */
  debugLive(): Promise<number>;
}

interface Freeable { free(): void }
export interface WasmLayout extends Freeable { step(n: number): void; positions(): Float32Array; settled(): boolean }
export interface WasmStarLayer extends Freeable {
  positions(): Float32Array; sizes(): Float32Array; phases(): Float32Array;
  freqs(): Float32Array; mags(): Float32Array; colors(): Float32Array;
}
export interface WasmModule {
  UniverseLayout: new (bodiesJson: string, seed: number) => WasmLayout;
  star_layer(kind: number, count: number, seed: number): WasmStarLayer;
  pick_body(positions: Float32Array, radii: Float32Array, ray: Float32Array): number;
  camera_path(from: Float32Array, to: Float32Array, samples: number, arc: boolean): Float32Array;
  fly_toward_pose(body: Float32Array, radius: number, camera: Float32Array): Float32Array;
  frame_pose(positions: Float32Array, fovDeg: number): Float32Array;
}

const move = (a: Float32Array): Float32Array => Comlink.transfer(a, [a.buffer]);

/** The API the worker exposes. Owns every wasm object it creates and frees it. */
export function createCoreApi(wasm: WasmModule): CoreApi {
  let layout: WasmLayout | null = null;
  let live = 0;

  const freeLayout = () => {
    if (layout) {
      layout.free();
      layout = null;
      live--;
    }
  };

  return {
    async layoutNew(bodies, seed) {
      freeLayout();
      layout = new wasm.UniverseLayout(JSON.stringify(bodies), seed);
      live++;
    },
    async layoutStep(n) {
      if (!layout) return new Float32Array(0);
      layout.step(n);
      return move(layout.positions());
    },
    async layoutSettled() {
      return layout ? layout.settled() : true;
    },
    async layoutFree() {
      freeLayout();
    },
    async starLayer(kind, count, seed) {
      const s = wasm.star_layer(kind, count, seed);
      live++;
      try {
        return {
          positions: move(s.positions()), sizes: move(s.sizes()), phases: move(s.phases()),
          freqs: move(s.freqs()), mags: move(s.mags()), colors: move(s.colors()),
        };
      } finally {
        s.free();
        live--;
      }
    },
    async pick(positions, radii, ray) {
      return wasm.pick_body(positions, radii, ray);
    },
    async cameraPath(from, to, samples, arc) {
      return move(wasm.camera_path(from, to, samples, arc));
    },
    async flyTowardPose(body, radius, camera) {
      return move(wasm.fly_toward_pose(body, radius, camera));
    },
    async framePose(positions, fovDeg) {
      return move(wasm.frame_pose(positions, fovDeg));
    },
    async debugLive() {
      return live;
    },
  };
}
