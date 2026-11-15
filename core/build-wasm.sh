#!/usr/bin/env sh
# Build the Rust core to WebAssembly: JS glue into src/wasm, the .wasm file into public/wasm.
set -e
cd "$(dirname "$0")"
wasm-pack build --target web --release --out-dir ../src/wasm
mkdir -p ../public/wasm
cp ../src/wasm/universe_core_bg.wasm ../public/wasm/universe_core_bg.wasm
