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

test("the screensaver starts on an idle Home and the waking button does nothing else", async ({ page }) => {
  await open(page, { screensaverMinutes: 5 });
  const focused = page.locator('[data-cinema-grid] [data-focused="true"]');
  const before = await focused.getAttribute("title");
  await page.clock.fastForward("04:00");
  await expect(page.locator("[data-screensaver]")).toHaveCount(0);
  await page.clock.fastForward("01:30");
  await expect(page.locator("[data-screensaver]")).toHaveCount(1);
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("[data-screensaver]")).toHaveCount(0);
  await expect(focused).toHaveAttribute("title", before);
  await expect(page.locator("[data-side-rail]")).toHaveAttribute("data-open", "false");
});

test("a pressed button restarts the idle wait, and Off never starts it", async ({ page }) => {
  await open(page, { screensaverMinutes: 5 });
  await page.clock.fastForward("04:00");
  await page.keyboard.press("ArrowRight");
  await page.clock.fastForward("04:00");
  await expect(page.locator("[data-screensaver]")).toHaveCount(0);
  await page.evaluate(() => AeroTizen.settings.update({ screensaverMinutes: 0 }));
  await page.clock.fastForward("01:30:00");
  await expect(page.locator("[data-screensaver]")).toHaveCount(0);
});

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
