import { Vector3, type PerspectiveCamera } from "three";

/** Label colours, also used by the CSS. Checked against each other for WCAG AA in the tests. */
export const LABEL_TEXT = "#EAF0FF";
export const LABEL_BG = "#0A0C1E";

/** DOM elements of the body labels by repo id, filled by `BodyLabels` and moved by `LabelDriver` every frame. */
export const labelRegistry = new Map<string, HTMLElement>();

export interface LabelSpot { x: number; y: number; visible: boolean }

const view = new Vector3();
const ndc = new Vector3();

/** Where a body's label goes on screen (CSS pixels, just below the body). `visible` is false for a body behind the camera, far off screen, or with a broken position. Writes into `out`, allocates nothing. */
export function projectLabel(out: LabelSpot, world: Vector3, camera: PerspectiveCamera, width: number, height: number, radius: number): void {
  out.visible = false; out.x = 0; out.y = 0;
  if (!Number.isFinite(world.x + world.y + world.z)) return;
  view.copy(world).applyMatrix4(camera.matrixWorldInverse);
  if (!(view.z < -0.001)) return; // behind or at the camera
  ndc.copy(world).project(camera);
  const rpx = (radius / -view.z) * camera.projectionMatrix.elements[5] * (height / 2);
  const x = (ndc.x * 0.5 + 0.5) * width;
  const y = (-ndc.y * 0.5 + 0.5) * height + rpx + 8;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  if (x < -0.1 * width || x > 1.1 * width || y < -0.1 * height || y > 1.1 * height) return;
  out.x = x; out.y = y; out.visible = true;
}

/** Hides lower-priority labels that overlap a higher-priority one. Index 0 has the highest priority; `visible` is updated in place. No allocation. */
export function declutter(xs: ArrayLike<number>, ys: ArrayLike<number>, widths: ArrayLike<number>, height: number, visible: boolean[]): void {
  for (let i = 1; i < visible.length; i++) {
    if (!visible[i]) continue;
    for (let j = 0; j < i; j++) {
      if (!visible[j]) continue;
      if (Math.abs(xs[i] - xs[j]) < (widths[i] + widths[j]) / 2 && Math.abs(ys[i] - ys[j]) < height) { visible[i] = false; break; }
    }
  }
}
