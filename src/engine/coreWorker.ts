import * as Comlink from "comlink";
import init, * as wasm from "@wasm/universe_core.js";
import { createCoreApi, lazyApi, type WasmModule } from "./coreApi";

// Expose first: messages that arrive while the .wasm is still loading wait instead of being dropped.
const ready = init({ module_or_path: new URL("/wasm/universe_core_bg.wasm", self.location.origin) }).then(() =>
  createCoreApi(wasm as unknown as WasmModule),
);
// A failed load must surface as a worker "error" event so the page can fall back to the list.
ready.catch((e) => setTimeout(() => { throw e; }));
Comlink.expose(lazyApi(ready));
