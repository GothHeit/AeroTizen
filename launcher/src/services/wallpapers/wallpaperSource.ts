/** Where Top Shelf pictures live. Add 1920x1080 JPEGs to this folder on this branch; no rebuild is needed. */
export interface WallpaperSource {
  readonly folder: string;
  readonly ref: string;
  readonly repo: string;
}

export const WALLPAPER_SOURCE: WallpaperSource = {
  repo: "GothHeit/AeroTizen",
  ref: "wallpapers",
  folder: "launcher/assets/wallpapers",
};

export interface WallpaperEntry {
  readonly name: string;
  readonly sha: string;
}

const PICTURE = /\.(jpe?g|png|webp)$/i;
const COMMIT = /^[0-9a-f]{40}$/;

const filePath = (source: WallpaperSource, name: string) => source.folder + "/" + encodeURIComponent(name);

/** GitHub answers with the branch's latest commit id, so CDN links never serve an old copy. */
export const commitUrl = (source: WallpaperSource) =>
  "https://api.github.com/repos/" + source.repo + "/commits/" + encodeURIComponent(source.ref);

export const listUrl = (source: WallpaperSource, commit: string) =>
  "https://api.github.com/repos/" + source.repo + "/contents/" + source.folder + "?ref=" + commit;

/** jsDelivr first; GitHub's raw host if the CDN fails. Commit-pinned links are cached for good. */
export const pictureUrls = (source: WallpaperSource, commit: string, name: string) => [
  "https://cdn.jsdelivr.net/gh/" + source.repo + "@" + commit + "/" + filePath(source, name),
  "https://raw.githubusercontent.com/" + source.repo + "/" + commit + "/" + filePath(source, name),
];

export const parseCommit = (text: string) => {
  const commit = text.trim();
  return COMMIT.test(commit) ? commit : null;
};

const naturalOrder = (left: WallpaperEntry, right: WallpaperEntry) =>
  left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: "base" });

interface ListingEntry {
  readonly name?: unknown;
  readonly sha?: unknown;
  readonly type?: unknown;
}

const isPictureEntry = (entry: ListingEntry | null): entry is { name: string; sha: string; type: "file" } =>
  Boolean(entry) &&
  entry?.type === "file" &&
  typeof entry.name === "string" &&
  typeof entry.sha === "string" &&
  PICTURE.test(entry.name);

/** Pictures from a GitHub folder listing, in natural order. Subfolders and other files are skipped. */
export const parseListing = (data: unknown): WallpaperEntry[] | null => {
  if (!Array.isArray(data)) {
    return null;
  }
  return (data as (ListingEntry | null)[])
    .filter(isPictureEntry)
    .map((entry) => ({ name: entry.name, sha: entry.sha }))
    .sort(naturalOrder);
};
