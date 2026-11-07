import { custom, fallback, wallpapers } from "virtual:shelf-images";

import type { ContinueItem, InstalledApp } from "../../contracts/launcher";

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const fileSlug = (path: string) => slug(path.slice(path.lastIndexOf("/") + 1).replace(/\.[^.]+$/, ""));

// A stable pick keeps each app on the same image across launches.
const hash = (value: string) => Array.from(value).reduce((total, char) => (total * 31 + char.charCodeAt(0)) >>> 0, 7);

export const SHELF_IMAGES = custom.length ? custom : fallback;

/** An image named after the app wins; otherwise apps share the remaining images. */
export const getShelfImage = (app: Pick<InstalledApp, "id" | "name">, images: readonly string[] = SHELF_IMAGES) => {
  const names = [slug(app.name), slug(app.id)];
  const named = images.find((path) => names.includes(fileSlug(path)));
  if (named || !images.length) {
    return named || null;
  }
  return images[hash(app.id) % images.length];
};

export interface ShelfFeature {
  readonly detail: string | null;
  readonly image: string | null;
  readonly kicker: string;
  readonly progress: number | null;
  readonly title: string;
}

/** Films and specials report season or episode 0, so they get no episode line, as on the classic card. */
export const getContinueFeature = (
  item: ContinueItem,
  formatEpisode: (season: number, episode: number) => string,
): Omit<ShelfFeature, "kicker"> => ({
  image: item.backgroundImage || item.image || item.thumbnailImage || null,
  title: item.title.trim(),
  detail: item.season > 0 && item.episode > 0 ? formatEpisode(item.season, item.episode) : null,
  progress: item.duration > 0 ? Math.max(0, Math.min(1, item.playback / item.duration)) : null,
});

/** A CSS url() that survives quotes, spaces and parentheses in artwork addresses. */
export const cssUrl = (path: string) => 'url("' + path.replace(/["\\\n\r]/g, (char) => encodeURIComponent(char)) + '")';

/** Wallpapers the user can pin to the shelf, with a small copy of each for Settings. */
export const SHELF_WALLPAPERS = wallpapers.map((path) => ({
  path,
  thumb: path.replace(/\/([^/]+)$/, "/thumbs/$1"),
  name: path.slice(path.lastIndexOf("/") + 1).replace(/\.[^.]+$/, ""),
}));

/** The pinned wallpaper, or null when none is set or the file no longer ships. */
export const getPinnedWallpaper = (path: string, list: readonly string[] = wallpapers) =>
  path && list.includes(path) ? path : null;
