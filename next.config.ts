import type { NextConfig } from "next";

const useStub = process.env.NEXT_PUBLIC_USE_STUB === "1";

const config: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  // Local runs without wasm-pack use a JS stand-in for the wasm package (see README).
  ...(useStub ? { turbopack: { resolveAlias: { "@wasm/universe_core.js": "./src/wasm-stub/universe_core.js" } } } : {}),
};

export default config;
