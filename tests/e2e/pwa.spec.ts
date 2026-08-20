import { expect, test } from "@playwright/test";

test("production manifest and service worker provide offline deep routes", async ({ context, page }) => {
  await page.goto("/");
  const manifestResponse = await page.request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBeTruthy();
  const manifest = await manifestResponse.json();
  expect(manifest.name).toBe("KJVenture");
  expect(manifest.icons).toEqual(expect.arrayContaining([
    expect.objectContaining({ sizes: "192x192" }),
    expect.objectContaining({ sizes: "512x512" }),
    expect.objectContaining({ purpose: "maskable" }),
  ]));

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  await context.setOffline(true);
  await page.goto("/studio");
  await expect(page.getByRole("heading", { name: "Session Studio" })).toBeVisible();
  await page.goto("/games/four-pics");
  await page.getByRole("button", { name: /start game/i }).click();
  await expect(page.locator(".four-pics-board")).toBeVisible();
  await page.goto("/an-unknown-offline-route");
  await expect(page.getByRole("heading", { name: /host beautiful bible game sessions anywhere/i })).toBeVisible();
});
