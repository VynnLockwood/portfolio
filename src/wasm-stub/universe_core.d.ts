export default function init(arg?: unknown): Promise<unknown>;
export class UniverseLayout {
  constructor(bodiesJson: string, seed: number);
  step(n: number): void;
  positions(): Float32Array;
  settled(): boolean;
  free(): void;
}
export class StarLayerData {
  positions(): Float32Array;
  sizes(): Float32Array;
  phases(): Float32Array;
  freqs(): Float32Array;
  mags(): Float32Array;
  colors(): Float32Array;
  free(): void;
}
export function star_layer(kind: number, count: number, seed: number): StarLayerData;
export function pick_body(positions: Float32Array | number[], radii: Float32Array | number[], ray: Float32Array | number[]): number;
export function camera_path(from: Float32Array | number[], to: Float32Array | number[], samples: number, arc: boolean): Float32Array;
export function fly_toward_pose(body: Float32Array | number[], radius: number, camera: Float32Array | number[]): Float32Array;
export function frame_pose(positions: Float32Array | number[], fovDeg: number): Float32Array;
