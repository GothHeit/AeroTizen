const { test, expect } = require("@playwright/test");

const open = async (page, settings = {}) => {
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

const openFind = async (page) => {
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("[data-side-rail]")).toHaveAttribute("data-open", "true");
  await page.keyboard.press("ArrowDown");
  await expect(page.locator('[data-side-rail] [data-focused="true"]')).toHaveAttribute("title", "Find an app");
  await page.keyboard.press("Enter");
  await page.keyboard.up("Enter");
  await expect(page.locator("#app-find")).toBeFocused();
};

test("Find an app narrows the grid as you type and Done moves to the first match", async ({ page }) => {
  await open(page);
  await openFind(page);
  await page.keyboard.type("tw");
  const tiles = page.locator("[data-cinema-grid] [data-app-id], [data-cinema-grid] [title]");
  await expect(page.locator("[data-home-content] h2")).toHaveCount(0);
  await expect
    .poll(async () => tiles.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("title"))))
    .toEqual(["Twitch"]);
  await page.keyboard.press("Enter");
  await expect(page.locator("#app-find")).not.toBeFocused();
  await expect(page.locator('[data-cinema-grid] [data-focused="true"]')).toHaveAttribute("title", "Twitch");
  // Back clears the filter and every app returns.
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-find-bar]")).toHaveCount(0);
  await expect(page.locator("[data-home-content] h2")).toHaveCount(1);
});

test("Find an app with no match says so and Back from the field clears it", async ({ page }) => {
  await open(page);
  await openFind(page);
  await page.keyboard.type("zzz");
  await expect(page.locator("[data-find-bar]")).toContainText("No apps match");
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-find-bar]")).toHaveCount(0);
  await expect(page.locator('[data-cinema-grid] [data-focused="true"]')).toHaveCount(1);
});

test("Search in the dock opens Samsung's search", async ({ page }) => {
  await open(page);
  await page.evaluate(() => {
    window.__launched = [];
    AeroTizen.apps.launch = (app) => window.__launched.push(app.id);
  });
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(page.locator('[data-side-rail] [data-focused="true"]')).toHaveAttribute("title", "Search");
  await page.keyboard.press("Enter");
  await page.keyboard.up("Enter");
  await expect.poll(() => page.evaluate(() => window.__launched)).toEqual(["com.samsung.tv.searchall"]);
});
