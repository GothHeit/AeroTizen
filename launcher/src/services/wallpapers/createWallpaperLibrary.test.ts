import { describe, expect, it, vi } from "vitest";

import { createStore } from "../../shared/state/createStore";

import { createMemoryCache } from "./createWallpaperCache";
import { createWallpaperLibrary } from "./createWallpaperLibrary";
import type { WallpaperSource } from "./wallpaperSource";
import { parseListing } from "./wallpaperSource";

const SOURCE: WallpaperSource = { repo: "owner/repo", ref: "wallpapers", folder: "pics" };
const COMMIT = "a".repeat(40);
const LISTING = [
  { type: "file", name: "10.jpg", sha: "s10" },
  { type: "file", name: "2.jpg", sha: "s2" },
  { type: "dir", name: "thumbs", sha: "d" },
  { type: "file", name: "README.md", sha: "r" },
];

const flush = async () => {
  for (let index = 0; index < 20; index += 1) {
    await Promise.resolve();
  }
};

const setup = ({ online = true, cache = createMemoryCache(), choice = "" } = {}) => {
  const requests: string[] = [];
  const fetch = vi.fn((url: string) => {
    requests.push(url);
    if (!online) {
      return Promise.reject(new Error("offline"));
    }
    if (url.includes("/commits/")) {
      return Promise.resolve(new Response(COMMIT + "\n"));
    }
    if (url.includes("/contents/")) {
      return Promise.resolve(new Response(JSON.stringify(LISTING)));
    }
    return Promise.resolve(new Response(new Blob(["picture:" + url])));
  });
  const settings = createStore(choice);
  let id = 0;
  const library = createWallpaperLibrary({
    source: SOURCE,
    cache,
    choice: settings,
    fetch,
    now: () => 1000,
    online: () => online,
    scale: (blob) => Promise.resolve(new Blob(["small"], { type: blob.type })),
    timers: { setTimeout: () => 1, clearTimeout: () => undefined },
    urls: { create: () => "blob:" + (id += 1), revoke: () => undefined },
  });
  return { library, settings, requests, cache };
};

describe("parseListing", () => {
  it("keeps pictures only, in natural order", () => {
    expect(parseListing(LISTING)?.map((entry) => entry.name)).toEqual(["2.jpg", "10.jpg"]);
    expect(parseListing({ message: "Not Found" })).toBeNull();
  });
});

describe("createWallpaperLibrary", () => {
  it("lists GitHub pictures and downloads them from jsDelivr at the listed commit", async () => {
    const { library, settings, requests } = setup();
    await flush();
    expect(library.getSnapshot().status).toBe("ready");
    expect(library.getSnapshot().items.map((item) => item.name)).toEqual(["2.jpg", "10.jpg"]);
    expect(await library.choose("10.jpg")).toBe(true);
    expect(requests).toContain("https://cdn.jsdelivr.net/gh/owner/repo@" + COMMIT + "/pics/10.jpg");
    settings.set("10.jpg");
    await flush();
    expect(library.getSnapshot().current).toMatch(/^blob:/);
    settings.set("black");
    await flush();
    expect(library.getSnapshot().current).toBeNull();
  });

  it("links each listed picture on jsDelivr for the screensaver", async () => {
    const { library } = setup();
    expect(library.pictureUrl("2.jpg")).toBeNull();
    await flush();
    expect(library.pictureUrl("2.jpg")).toBe("https://cdn.jsdelivr.net/gh/owner/repo@" + COMMIT + "/pics/2.jpg");
  });

  it("makes small copies for the picker", async () => {
    const { library } = setup();
    await flush();
    library.showThumbs();
    await flush();
    await flush();
    expect(library.getSnapshot().items.every((item) => item.thumb)).toBe(true);
  });

  it("shows the saved picture when GitHub cannot be reached", async () => {
    const first = setup();
    await flush();
    await first.library.choose("2.jpg");
    first.settings.set("2.jpg");
    await flush();
    first.library.dispose();

    const offline = setup({ online: false, cache: first.cache, choice: "2.jpg" });
    await flush();
    await offline.library.refresh(true);
    await flush();
    expect(offline.library.getSnapshot().current).toMatch(/^blob:/);
    expect(offline.library.getSnapshot().status).toBe("offline");
    expect(offline.library.getSnapshot().items.map((item) => item.name)).toEqual(["2.jpg", "10.jpg"]);
  });

  it("stays black, and reports the failure, when a picked picture cannot be downloaded", async () => {
    const { library, cache } = setup();
    await flush();
    const offline = setup({ online: false, cache, choice: "black" });
    await flush();
    library.dispose();
    expect(await offline.library.choose("10.jpg")).toBe(false);
    expect(offline.library.getSnapshot().failed).toBe("10.jpg");
    expect(offline.library.getSnapshot().current).toBeNull();
  });
});
