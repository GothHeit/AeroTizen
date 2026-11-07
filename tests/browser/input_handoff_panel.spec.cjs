const { test, expect } = require("@playwright/test");

// Cinema hands HDMI to Samsung's viewer (the remote reaches the console). Home there opens the
// side panel; closing it hands the input back; anything else in the panel leaves the input.
const setHidden = (page, hidden) =>
  page.evaluate((hidden) => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);

test("Home from a handed-off input opens the panel; Right hands it back", async ({ page }) => {
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
    AeroTizen.homewatch.openNativeLiveTV = (source) => {
      window.handoffs.push(source.type + " " + source.number);
      return true;
    };
    AeroTizen.inputs.show(AeroTizen.inputs.sources[0]);
  });
  expect(await page.evaluate(() => window.handoffs)).toEqual(["HDMI 1"]);
  await expect(page.locator("body")).not.toHaveClass(/tv-panel/);

  // The viewer covers the launcher; Home brings it back with the panel on the Xbox.
  await setHidden(page, true);
  await setHidden(page, false);
  await expect(page.locator("body")).toHaveClass(/tv-panel/);
  await expect(page.locator("[data-side-rail]")).toBeVisible();
  await expect(page.locator('[data-side-rail] [data-focused="true"]')).toHaveAttribute("title", "Xbox");
  await expect(page.locator("[data-shelf-meta]")).toBeHidden();

  // Arrows move in the panel while it is open.
  await page.keyboard.press("ArrowUp");
  expect(await page.evaluate(() => AeroTizen.inputs.peeking)).toBe(true);

  // Right (or Back) closes the panel and gives the screen back to the console.
  await page.keyboard.press("ArrowRight");
  expect(await page.evaluate(() => window.handoffs)).toEqual(["HDMI 1", "HDMI 1"]);
  expect(await page.evaluate(() => AeroTizen.inputs.peeking)).toBe(false);
  await expect(page.locator("body")).not.toHaveClass(/\btv\b/);

  // Home again later, then Settings in the panel leaves the input for AeroTizen's Home.
  await page.waitForTimeout(1100);
  await setHidden(page, true);
  await setHidden(page, false);
  await expect(page.locator("body")).toHaveClass(/tv-panel/);
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  expect(await page.evaluate(() => AeroTizen.inputs.peeking)).toBe(false);
  await expect(page.locator("body")).not.toHaveClass(/tv-panel/);
  expect(await page.evaluate(() => window.handoffs.length)).toBe(2);
  expect(errors).toEqual([]);
});
