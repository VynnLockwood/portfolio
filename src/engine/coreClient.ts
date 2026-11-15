import * as Comlink from "comlink";
import type { CoreApi } from "./coreApi";

let core: CoreApi | null = null;
let terminate: (() => void) | null = null;

/** Counts of Workers made and stopped; the leak tests check they balance. */
export const workerStats = { created: 0, terminated: 0 };

/** The WASM core, running in a Web Worker (made on first use). */
export function getCore(): CoreApi {
  if (!core) {
    const worker = new Worker(new URL("./coreWorker.ts", import.meta.url), { type: "module" });
    workerStats.created++;
    core = Comlink.wrap<CoreApi>(worker) as unknown as CoreApi;
    terminate = () => worker.terminate();
  }
  return core;
}

/** Tests inject a fake core; `stop` stands in for Worker.terminate. */
export function setCore(c: CoreApi | null, stop?: () => void): void {
  core = c;
  terminate = stop ?? null;
  if (c && stop) workerStats.created++;
}

/** Free the layout, stop the worker and forget it. Safe to call twice, and while a call is still pending. */
export async function disposeCore(): Promise<void> {
  const c = core;
  const stop = terminate;
  core = null;
  terminate = null;
  if (!c) return;
  try {
    await c.layoutFree();
  } catch {
    // the worker may already be gone; terminating below is what matters
  }
  if (stop) {
    stop();
    workerStats.terminated++;
  }
}
