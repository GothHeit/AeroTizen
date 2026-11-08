const { test, expect } = require("@playwright/test");

const open = async (page, settings = {}, time = "2026-11-07T15:00:00") => {
  await page.clock.install({ time: new Date(time) });
  await page.route("https://**/*", (r) => r.fulfill({ body: "{}" }));
  await page.route("http://127.0.0.1:47790/**", (r) => r.fulfill({ body: "{}" }));
  await page.addInitScript(
    (settings) =>
      localStorage.setItem(
        "aerotizen.settings.v1",
        JSON.stringify({ cinemaUi: true, showWeather: false, home: ["demo0", "demo1"], ...settings }),
      ),
    settings,
  );
  await page.goto("/");
  await page.waitForFunction(() => AeroTizen.apps.ready);
};

test("the Home dims at night only", async ({ page }) => {
  await open(page, {}, "2026-11-07T23:30:00");
  await expect(page.locator("[data-night-veil]")).toHaveAttribute("data-on", "true");
  await page.evaluate(() => AeroTizen.settings.update({ nightDim: false }));
  await expect(page.locator("[data-night-veil]")).toHaveAttribute("data-on", "false");
});

test("the Home is not dimmed in the day", async ({ page }) => {
  await open(page, {}, "2026-11-07T15:00:00");
  await expect(page.locator("[data-night-veil]")).toHaveAttribute("data-on", "false");
});

test("an idle Home stays as it is, with no screensaver", async ({ page }) => {
  await open(page, { screensaverMinutes: 5 });
  await page.clock.fastForward("02:00:00");
  await expect(page.locator("[data-screensaver]")).toHaveCount(0);
  await expect(page.locator("[data-cinema-home]")).toBeVisible();
});
