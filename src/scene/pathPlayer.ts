/** One frame never advances time by more than this, so a hidden tab coming back cannot teleport the camera. */
export const MAX_DT_MS = 50;
export const clampDt = (dtMs: number): number => Math.min(Math.max(dtMs, 0), MAX_DT_MS);

/** Plays a path sampled by the Rust core (6 floats per pose: position xyz, target xyz).
 *  Time is accumulated from clamped frame steps, and the render loop only reads an array: no allocation per frame. */
export class PathPlayer {
  private path: Float32Array | null = null;
  private duration = 1;
  private elapsed = 0;
  private last = 0;

  start(path: Float32Array, durationMs: number, nowMs: number): void {
    this.path = path.length >= 12 ? path : null;
    this.duration = Math.max(1, durationMs);
    this.elapsed = 0;
    this.last = nowMs;
  }

  get active(): boolean {
    return this.path !== null;
  }

  /** 0..1 of the current (or just finished) move. */
  get progress(): number {
    return Math.min(1, this.elapsed / this.duration);
  }

  /** Writes the current pose into `out` (6 floats). Returns true while the move is still playing. */
  sample(nowMs: number, out: Float32Array): boolean {
    const path = this.path;
    if (!path) return false;
    this.elapsed += clampDt(nowMs - this.last);
    this.last = nowMs;
    const t = this.progress;
    const n = path.length / 6;
    const f = t * (n - 1);
    const i = Math.min(n - 2, Math.floor(f));
    const k = f - i;
    for (let c = 0; c < 6; c++) out[c] = path[i * 6 + c] + (path[(i + 1) * 6 + c] - path[i * 6 + c]) * k;
    if (t >= 1) {
      this.path = null;
      return false;
    }
    return true;
  }

  /** Stop where we are. Returns the progress reached. */
  cancel(): number {
    const p = this.progress;
    this.path = null;
    return p;
  }
}
