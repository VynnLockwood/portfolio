import type { Page } from "@playwright/test";

export interface Gpu { geometries: number; textures: number }

/** Opens the page (it starts in the list view), then goes to 3D and waits until the scene reports in. */
export async function open(page: Page, query = "e2e=1") {
  await page.goto(`/?${query}`);
  await page.getByRole("button", { name: "Explore in 3D" }).click();
  await waitFor3d(page);
}

export async function waitFor3d(page: Page) {
  await page.waitForFunction(() => typeof (window as any).__universe?.gpu === "function", undefined, { timeout: 30_000 });
  await page.waitForTimeout(1200); // stars and layout arrive asynchronously from the worker
}

export const gpu = (page: Page) => page.evaluate(() => (window as any).__universe.gpu() as Gpu);
export const workers = (page: Page) => page.evaluate(() => (window as any).__universe.workers() as { created: number; terminated: number });
export const wasmLive = (page: Page) => page.evaluate(() => (window as any).__universe.wasmLive() as Promise<number>);

export async function toList(page: Page) {
  await page.getByRole("button", { name: "Back to list" }).click();
  await page.waitForFunction(() => typeof (window as any).__universe?.gpu !== "function");
}
export async function toThreeD(page: Page) {
  await page.getByRole("button", { name: "Explore in 3D" }).click();
  await waitFor3d(page);
}
