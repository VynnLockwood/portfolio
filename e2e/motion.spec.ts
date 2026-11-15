import { expect, test } from "@playwright/test";
import { open } from "./helpers";

test("reduced motion has no slow greeting fade in 3D", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/?e2e=1");
  await expect(page.locator('[data-view="list"]')).toBeVisible();
  await page.getByRole("button", { name: "Explore in 3D" }).click();
  await expect(page.locator("canvas")).toBeVisible();
  const dur = await page.getByTestId("welcome").evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(dur).toBe("0s");
  await ctx.close();
});

test("starts in the list, 3D is one click away and keeps a sane frame time", async ({ page }) => {
  // Software GL is fill-bound (about 230 ms at 720p, 130 ms at 360p with the per-pixel sky), so use a small viewport here.
  await page.setViewportSize({ width: 640, height: 360 });
  await page.goto("/?e2e=1");
  await expect(page.locator('[data-view="list"]')).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await open(page);
  await expect(page.locator('[data-view="3d"]')).toBeVisible();
  await page.waitForTimeout(5000);
  const ms = await page.evaluate(() => (window as any).__universe.frameMs() as number);
  expect(ms).toBeGreaterThan(0);
  expect(ms).toBeLessThan(200); // software GL does the per-pixel sky on the CPU; loose bound for software GL; the strict 16 ms check is PERF=1 on a GPU machine
});

test("PERF=1: frame time stays under 16.7 ms on a machine with a GPU", async ({ page }) => {
  test.skip(!process.env.PERF, "run with PERF=1 on a GPU machine");
  await open(page);
  await page.waitForTimeout(5000);
  expect(await page.evaluate(() => (window as any).__universe.frameMs() as number)).toBeLessThan(16.7);
});
