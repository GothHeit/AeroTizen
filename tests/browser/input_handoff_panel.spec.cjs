const { test, expect } = require("@playwright/test");

// Cinema hands HDMI to Samsung's viewer, so the remote reaches the console. Home there comes
// straight back to AeroTizen's Home with the side panel closed, and no picture behind it.
const setHidden = (page, hidden) =>
  page.evaluate((hidden) => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);

test("Home from a handed-off input returns to AeroTizen's Home", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("https://**/*", (r) => r.fulfill({ body: "{}" }));
  await page.route("http://127.0.0.1:47790/**", (r) => r.fulfill({ body: "{}" }));
  await page.addInitScript(() =>
    localStorage.setItem("aerotizen.settings.v1", JSON.stringify({ cinemaUi: true, showWeather: false })),
  );
  await page.goto("/");
  await page.waitForFunction(() => AeroTizen.apps.ready && AeroTizen.inputs.sources.length > 0);
  await page.evaluate(() => {
    window.handoffs = [];
    AeroTizen.homewatch.openNativeViewer = (source) => {
      window.handoffs.push(source.type + " " + source.number);
      return true;
    };
  });
  // Choose the Xbox from the side panel.
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator('[data-side-rail][data-open="true"]')).toHaveCount(1);
  await page.evaluate(() => AeroTizen.inputs.show(AeroTizen.inputs.sources[0]));
  expect(await page.evaluate(() => window.handoffs)).toEqual(["HDMI 1"]);

  await setHidden(page, true);
  await setHidden(page, false);
  expect(await page.evaluate(() => AeroTizen.inputs.peeking)).toBe(false);
  await expect(page.locator("body")).not.toHaveClass(/\btv\b|tv-panel/);
  await expect(page.locator('[data-side-rail][data-open="true"]')).toHaveCount(0);
  await expect(page.locator("[data-cinema-home]")).toBeVisible();

  // A later return (e.g. from an app) is not mistaken for Home from the Xbox.
  await page.waitForTimeout(1100);
  await setHidden(page, true);
  await setHidden(page, false);
  expect(await page.evaluate(() => window.handoffs.length)).toBe(1);
  expect(errors).toEqual([]);
});
