import { expect, test } from "vitest";

import type { ContinueItem } from "../../contracts/launcher";

import { cssUrl, getContinueFeature } from "./shelf";

const programme = "Programme";
const padded = "  Spaced  ";
const item = (patch: Partial<ContinueItem>): ContinueItem => ({
  key: "item",
  title: programme,
  sourceId: "app",
  sourceName: "App",
  season: 1,
  episode: 6,
  duration: 100,
  playback: 70,
  ...patch,
});
const format = (season: number, episode: number) => "T" + season + " E" + episode;

test("episode line follows the language and skips films and specials", () => {
  expect(getContinueFeature(item({}), format).detail).toBe("T1 E6");
  expect(getContinueFeature(item({ season: 0, episode: 4 }), format).detail).toBeNull();
  expect(getContinueFeature(item({ season: 2, episode: 0 }), format).detail).toBeNull();
});

test("progress stays between empty and full, and is absent without a duration", () => {
  expect(getContinueFeature(item({ playback: 150 }), format).progress).toBe(1);
  expect(getContinueFeature(item({ duration: 0 }), format).progress).toBeNull();
});

test("artwork prefers the wide background and trims padded titles", () => {
  const feature = getContinueFeature(
    item({ title: padded, image: "/poster.jpg", backgroundImage: "/wide.jpg" }),
    format,
  );
  expect(feature.image).toBe("/wide.jpg");
  expect(feature.title).toBe("Spaced");
});

test("css urls survive quotes, parentheses and line breaks in artwork addresses", () => {
  expect(cssUrl("https://cdn.example/a (1).jpg")).toBe('url("https://cdn.example/a (1).jpg")');
  expect(cssUrl('x"y\\z\n')).toBe('url("x%22y%5Cz%0A")');
});
