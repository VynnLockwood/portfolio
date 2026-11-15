import repos from "../data/repos.json";
import type { Repo } from "../data/types";
import type { CoreApi } from "../engine/coreApi";

const list = repos as Repo[];

/** Opens a repo in a new tab. Must be called straight from the click handler so the browser allows it. */
export function openRepo(url: string): void {
  window.open(url, "_blank", "noopener");
}

/** Click on body `index`: open the repo first (inside the gesture), then fly the camera toward it. */
export function activateRepo(index: number, flyToward: (i: number) => void, open: (url: string) => void = openRepo): void {
  open(list[index].url);
  flyToward(index);
}

/** Runs an async function with at most one call in flight. Calls made meanwhile collapse into the newest one. */
export class LatestWins<A extends unknown[], R> {
  private running = false;
  private pending: A | null = null;

  constructor(
    private fn: (...a: A) => Promise<R>,
    private onResult: (r: R) => void,
    private onError: (e: unknown) => void = () => {},
  ) {}

  call(...a: A): void {
    if (this.running) {
      this.pending = a;
      return;
    }
    this.run(a);
  }

  private run(a: A): void {
    this.running = true;
    this.fn(...a)
      .then((r) => this.onResult(r))
      .catch((e) => this.onError(e))
      .finally(() => {
        this.running = false;
        const next = this.pending;
        this.pending = null;
        if (next) this.run(next);
      });
  }
}

/** Pointer picking through the Rust core, one request at a time, silent after `dispose()`. */
export class Picker {
  private lw: LatestWins<[Float32Array], number>;
  private dead = false;

  constructor(
    getCore: () => CoreApi,
    onHit: (index: number) => void,
    snapshot: () => { positions: Float32Array; radii: Float32Array },
  ) {
    this.lw = new LatestWins(
      async (ray: Float32Array) => {
        if (this.dead) return -1; // never wake a core that was torn down
        const s = snapshot();
        return getCore().pick(s.positions.slice(), s.radii.slice(), ray);
      },
      (i) => {
        if (!this.dead) onHit(i);
      },
    );
  }

  /** `ray` = origin xyz + unit direction xyz. */
  move(ray: Float32Array): void {
    if (!this.dead) this.lw.call(ray);
  }

  dispose(): void {
    this.dead = true;
  }
}
