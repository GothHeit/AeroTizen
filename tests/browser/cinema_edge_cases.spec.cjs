const { test, expect } = require("@playwright/test");

const open = async (page, settings) => {
  await page.route("https://**/*", (r) => r.fulfill({ body: "{}" }));
  await page.route("http://127.0.0.1:47790/**", (r) => r.fulfill({ body: "{}" }));
  await page.addInitScript(
    (settings) =>
      localStorage.setItem(
        "aerotizen.settings.v1",
        JSON.stringify({ cinemaUi: true, showWeather: false, continueWatching: true, ...settings }),
      ),
    settings,
  );
  await page.goto("/");
  await page.waitForFunction(() => AeroTizen.apps.ready);
};

test("with no favourites, every app moves into the top row under the shelf", async ({ page }) => {
  await open(page, { home: [] });
  await expect(page.locator("[data-home-content] h2")).toHaveCount(0);
  const tile = page.locator('[data-cinema-grid] [data-focused="true"]');
  await expect(tile).toHaveCount(1);
  expect((await tile.boundingBox()).y).toBeGreaterThan(800);
  await expect(page.locator("[data-shelf-meta]")).toContainText(await tile.getAttribute("title"));
});

test("long programme titles stay within two lines and broken artwork falls back", async ({ page }) => {
  await open(page, { home: ["demo0"] });
  await page.evaluate(() => {
    AeroTizen.continueWatching.items = [
      {
        key: "long",
        title: "Um título de programa muito longo que nunca deveria ocupar mais do que duas linhas na vitrine",
        sourceId: "demo0",
        sourceName: "App",
        season: 0,
        episode: 3,
        duration: 100,
        playback: 40,
        image: "https://invalid.example/missing (1).jpg",
      },
    ];
    AeroTizen.inputs.refresh();
  });
  const title = page.locator("[data-shelf-meta] > div").nth(1);
  await expect(title).toHaveAttribute("data-long", "true");
  const box = await title.boundingBox();
  const lineHeight = await title.evaluate((node) => parseFloat(getComputedStyle(node).lineHeight));
  expect(box.height).toBeLessThanOrEqual(lineHeight * 2 + 1);
  // A season 0 special shows no episode line.
  await expect(page.locator("[data-shelf-meta]")).not.toContainText("E3");
  await expect
    .poll(() =>
      page
        .locator("[data-top-shelf] > div")
        .first()
        .evaluate((node) => getComputedStyle(node).backgroundImage),
    )
    .toContain("assets/");
});

test("the clock steps aside while the grid is scrolled", async ({ page }) => {
  await open(page, { home: ["demo0", "demo1", "demo2", "demo3", "demo4", "demo5"] });
  const clock = page.locator("[data-cinema-status]");
  await expect(clock).toHaveAttribute("data-shown", "true");
  await page.keyboard.press("ArrowDown");
  await expect(clock).toHaveAttribute("data-shown", "false");
});

test("an empty TV explains how to reach Settings", async ({ page }) => {
  await page.route("**/js/apps.js", async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace("apps.all = [", "apps.all = [].filter.call([");
    await route.fulfill({ response, body: body.replace("]\n        .map(", "], () => false)\n        .map(") });
  });
  await open(page, { home: [] });
  await expect(page.locator("[data-shelf-meta]")).toContainText("No apps found.");
  await expect(page.locator("[data-shelf-meta]")).toContainText("Press Left for Settings and inputs.");
});
