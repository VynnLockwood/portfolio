import * as Comlink from "comlink";
import type { CoreApi } from "./coreApi";

let core: CoreApi | null = null;
let terminate: (() => void) | null = null;
let failed: Promise<never> | null = null;

/** Counts of Workers made and stopped; the leak tests check they balance. */
export const workerStats = { created: 0, terminated: 0 };

/** The WASM core, running in a Web Worker (made on first use). */
export function getCore(): CoreApi {
  if (!core) {
    const worker = new Worker(new URL("./coreWorker.ts", import.meta.url), { type: "module" });
    workerStats.created++;
    core = Comlink.wrap<CoreApi>(worker) as unknown as CoreApi;
    terminate = () => worker.terminate();
    // a worker that cannot load or start (for example the .wasm file is missing) fires "error"; calls would otherwise hang
    failed = new Promise<never>((_, reject) => {
      worker.addEventListener("error", (e) => reject(new Error(e.message || "core worker failed")), { once: true });
    });
    failed.catch(() => {});
  }
  return core;
}

/** Tests inject a fake core; `stop` stands in for Worker.terminate. */
export function setCore(c: CoreApi | null, stop?: () => void): void {
  core = c;
  failed = null;
  terminate = stop ?? null;
  if (c && stop) workerStats.created++;
}

/** Free the layout, stop the worker and forget it. Safe to call twice, and while a call is still pending. */
export async function disposeCore(): Promise<void> {
  const c = core;
  const stop = terminate;
  core = null;
  terminate = null;
  failed = null;
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

/** Resolves when the core answers; rejects if the worker errors, the call fails, or nothing answers in time. */
export async function whenCoreReady(timeoutMs = 15000): Promise<void> {
  const c = getCore();
  const gone = failed;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("core did not start")), timeoutMs);
  });
  try {
    await Promise.race([c.debugLive(), timeout, ...(gone ? [gone] : [])]);
  } finally {
    clearTimeout(timer);
  }
}
