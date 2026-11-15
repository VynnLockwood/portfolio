import * as Comlink from "comlink";
import init, * as wasm from "@wasm/universe_core.js";
import { createCoreApi, type WasmModule } from "./coreApi";

await init({ module_or_path: new URL("/wasm/universe_core_bg.wasm", self.location.origin) });
Comlink.expose(createCoreApi(wasm as unknown as WasmModule));
