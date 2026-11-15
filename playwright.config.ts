import { defineConfig } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  workers: 1,
  use: {
    baseURL: `http://localhost:${PORT}`,
    launchOptions: {
      // CHROMIUM_PATH picks a specific browser; SwiftShader gives headless Chrome a software WebGL
      executablePath: process.env.CHROMIUM_PATH || undefined,
      args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
    },
  },
  // NEXT_PUBLIC_USE_STUB=1 builds against the JS stand-in for the wasm package (no wasm-pack needed)
  webServer: {
    command: `sh -c "npx next build && npx serve out -l ${PORT} --no-clipboard"`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
