import { expect, test } from "@playwright/test";
import { gpu, open, toList, toThreeD, wasmLive, workers } from "./helpers";

// Switching to the list unmounts the canvas and stops the worker; going back builds it again. None of that may pile up.
test("switching 3D / list many times does not grow GPU buffers, workers or wasm objects", async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  for (let i = 0; i < 3; i++) { await toList(page); await toThreeD(page); }
  const warm = await gpu(page);
  const warmWasm = await wasmLive(page);
  for (let i = 0; i < 10; i++) { await toList(page); await toThreeD(page); }
  const after = await gpu(page);
  expect(after.geometries).toBeLessThanOrEqual(warm.geometries);
  expect(after.textures).toBeLessThanOrEqual(warm.textures);
  expect(await wasmLive(page)).toBeLessThanOrEqual(warmWasm);
  const w = await workers(page);
  expect(w.created - w.terminated).toBeLessThanOrEqual(1); // only the live one
  expect(errors).toEqual([]);
  await toList(page);
  await page.waitForTimeout(500);
  await expect(page.getByText("3D could not start")).toHaveCount(0); // leaving 3D on purpose is not an error
});

// The high tier adds the per-pixel sky, rings and the sun corona; they must be freed too.
test("the high tier does not grow GPU buffers or workers across list / 3D switches", async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 480, height: 270 }); // software GL is fill-bound
  await open(page, "e2e=1&tier=high");
  for (let i = 0; i < 2; i++) { await toList(page); await toThreeD(page); }
  const warm = await gpu(page);
  for (let i = 0; i < 4; i++) { await toList(page); await toThreeD(page); }
  const after = await gpu(page);
  expect(after.geometries).toBeLessThanOrEqual(warm.geometries);
  expect(after.textures).toBeLessThanOrEqual(warm.textures);
  const w = await workers(page);
  expect(w.created - w.terminated).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});

test("toggling the role tags quickly leaves no extra GPU buffers and no errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  const tags = ["Backend", "Data", "Full-stack", "AI"];
  const toggle = async (n: number) => { for (let i = 0; i < n; i++) await page.getByRole("button", { name: tags[i % 4] }).click(); await page.waitForTimeout(800); };
  await toggle(4); // first use may create things once; growth under repetition is the leak
  const warm = await gpu(page);
  await toggle(30);
  expect(await gpu(page)).toEqual(warm);
  expect(errors).toEqual([]);
});

test("resizing the window does not add GPU buffers", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  const resize = async (sizes: number[][]) => {
    for (const [w, h] of sizes) { await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(300); }
  };
  await resize([[900, 600], [1400, 900], [1000, 700]]); // first resizes may create render targets once
  const warm = await gpu(page);
  await resize([[900, 600], [1400, 900], [1000, 700], [800, 500], [1280, 720], [1100, 800]]);
  expect(await gpu(page)).toEqual(warm);
  expect(errors).toEqual([]);
});

// A worker that cannot start must not leave a blank page: the list view and a one-line notice take over.
test("a worker that fails to start falls back to the list with a notice", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    (window as any).Worker = class extends EventTarget {
      constructor() { super(); setTimeout(() => this.dispatchEvent(new ErrorEvent("error", { message: "blocked" })), 0); }
      postMessage() {}
      terminate() {}
    };
  });
  await page.goto("/?e2e=1");
  await page.getByRole("button", { name: "Explore in 3D" }).click();
  await expect(page.getByRole("status")).toContainText("showing the list instead", { timeout: 30_000 });
  await expect(page.locator('[data-view="list"]')).toBeVisible();
  await expect(page.getByRole("link", { name: /Singularity/ })).toBeVisible();
  expect(errors).toEqual([]);
});

// Only meaningful against the real wasm build (CI): the .wasm file itself is blocked.
test("a blocked .wasm file falls back to the list with a notice", async ({ page }) => {
  test.skip(!process.env.WASM_REAL, "needs the real wasm build (set WASM_REAL=1)");
  await page.route("**/wasm/*.wasm", (r) => r.abort());
  await page.goto("/?e2e=1");
  await page.getByRole("button", { name: "Explore in 3D" }).click();
  await page.getByRole("button", { name: "Explore in 3D" }).click();
  await expect(page.getByRole("status")).toContainText("showing the list instead", { timeout: 30_000 });
  await expect(page.locator('[data-view="list"]')).toBeVisible();
});

// Real wasm only: the worker must answer calls sent while the .wasm was still loading (stars and layout actually arrive).
test("the real core answers and stays in 3D", async ({ page }) => {
  test.skip(!process.env.WASM_REAL, "needs the real wasm build (set WASM_REAL=1)");
  await open(page);
  expect(typeof (await wasmLive(page))).toBe("number");
  await page.waitForTimeout(3000);
  await expect(page.locator('[data-view="3d"]')).toBeVisible();
  await expect(page.getByText("3D could not start")).toHaveCount(0);
});
