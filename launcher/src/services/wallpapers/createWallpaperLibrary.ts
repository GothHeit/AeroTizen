import type { WallpaperItem, WallpaperLibrary, WallpaperLibraryState } from "../../contracts/wallpapers";
import { isPictureChoice } from "../../contracts/wallpapers";
import type { Store } from "../../shared/state/createStore";
import { createStore } from "../../shared/state/createStore";

import type { WallpaperCache } from "./createWallpaperCache";
import type { WallpaperEntry, WallpaperSource } from "./wallpaperSource";
import { commitUrl, listUrl, parseCommit, parseListing, pictureUrls } from "./wallpaperSource";

interface SavedLibrary {
  checkedAt: number;
  commit: string;
  items: WallpaperEntry[];
}

interface SavedPicture {
  blob: Blob;
  name: string;
  sha: string;
}

export interface WallpaperLibraryOptions {
  cache: WallpaperCache;
  /** The saved Top Shelf choice: "", "black" or a file name. */
  choice: Store<string>;
  fetch(url: string, init?: RequestInit): Promise<Response>;
  now(): number;
  online(): boolean;
  /** Returns a small JPEG copy of a picture for the picker. */
  scale(picture: Blob): Promise<Blob>;
  source: WallpaperSource;
  timers: {
    clearTimeout(id: number | undefined): void;
    setTimeout(callback: () => void, delay: number): number;
  };
  urls: { create(blob: Blob): string; revoke(url: string): void };
}

const MINUTE = 60 * 1000;
/** A list younger than this is reused when Settings opens. */
const FRESH = 10 * MINUTE;
/** The list is checked again this often while the launcher stays open. */
const RECHECK = 6 * 60 * MINUTE;
const FIRST_RETRY = MINUTE;
const LAST_RETRY = 30 * MINUTE;
const LIBRARY_KEY = "library";
const PICTURE_KEY = "picture";
const THUMB_PREFIX = "thumb:";

// Duck-typed: storage may hand back a Blob from another realm.
const isBlob = (value: unknown): value is Blob =>
  Boolean(value) && typeof (value as Blob).size === "number" && typeof (value as Blob).slice === "function";

const isSavedLibrary = (value: unknown): value is SavedLibrary =>
  Boolean(value) &&
  typeof (value as SavedLibrary).commit === "string" &&
  typeof (value as SavedLibrary).checkedAt === "number" &&
  Array.isArray((value as SavedLibrary).items);

const isSavedPicture = (value: unknown): value is SavedPicture =>
  Boolean(value) &&
  typeof (value as SavedPicture).name === "string" &&
  typeof (value as SavedPicture).sha === "string" &&
  isBlob((value as SavedPicture).blob);

/**
 * Top Shelf pictures from GitHub, served by jsDelivr. The chosen picture and small copies
 * for the picker are kept on the TV, so the shelf still works offline; with nothing saved it stays black.
 */
export const createWallpaperLibrary = (options: WallpaperLibraryOptions): WallpaperLibrary => {
  const { cache, choice, source, timers, urls } = options;
  const store = createStore<WallpaperLibraryState>({
    checkedAt: null,
    current: null,
    failed: null,
    items: [],
    pending: null,
    status: "checking",
  });
  const update = (patch: Partial<WallpaperLibraryState>) => store.set({ ...store.getSnapshot(), ...patch });

  let commit: string | null = null;
  let entries: readonly WallpaperEntry[] = [];
  let shown: SavedPicture | null = null;
  let staged: SavedPicture | null = null;
  let refreshing: Promise<void> | null = null;
  let syncRun = 0;
  let timer: number | undefined;
  let retryDelay = FIRST_RETRY;
  let thumbsWanted = false;
  let thumbing = false;
  let disposed = false;
  const skipped = new Set<string>();

  const show = (picture: SavedPicture | null) => {
    const previous = store.getSnapshot().current;
    shown = picture;
    update({ current: picture ? urls.create(picture.blob) : null });
    if (previous) {
      urls.revoke(previous);
    }
  };

  const setItems = (list: readonly WallpaperEntry[]) => {
    const previous = store.getSnapshot().items;
    const items: WallpaperItem[] = list.map((entry) => ({
      name: entry.name,
      sha: entry.sha,
      thumb: previous.find((item) => item.sha === entry.sha)?.thumb ?? null,
    }));
    previous
      .filter((item) => item.thumb && !items.some((next) => next.thumb === item.thumb))
      .forEach((item) => urls.revoke(item.thumb as string));
    update({ items });
  };

  const download = async (entry: WallpaperEntry) => {
    if (!commit) {
      throw new Error("No picture list yet.");
    }
    for (const url of pictureUrls(source, commit, entry.name)) {
      try {
        const response = await options.fetch(url);
        const blob = response.ok ? await response.blob() : null;
        if (blob && blob.size) {
          return blob;
        }
      } catch {
        // Try the next host.
      }
    }
    throw new Error("Picture could not be downloaded.");
  };

  const schedule = (delay: number) => {
    timers.clearTimeout(timer);
    timer = disposed ? undefined : timers.setTimeout(() => void refresh(true), delay);
  };

  /** Makes the painted picture match the saved choice, from memory, the TV's cache or the network. */
  const sync = async () => {
    const run = ++syncRun;
    const name = choice.getSnapshot();
    if (!isPictureChoice(name)) {
      if (shown) {
        show(null);
      }
      return;
    }
    const entry = entries.find((item) => item.name === name);
    const fresh = (picture: SavedPicture | null) =>
      Boolean(picture && picture.name === name && (!entry || entry.sha === picture.sha));
    if (fresh(shown)) {
      return;
    }
    if (!shown || shown.name !== name) {
      const saved = staged && staged.name === name ? staged : await cache.get<unknown>(PICTURE_KEY);
      if (run !== syncRun) {
        return;
      }
      const usable = isSavedPicture(saved) && saved.name === name ? saved : null;
      show(usable);
      if (fresh(usable)) {
        return;
      }
    }
    if (!entry) {
      return;
    }
    try {
      const blob = await download(entry);
      const picture = { name, sha: entry.sha, blob };
      await cache.put(PICTURE_KEY, picture);
      if (run === syncRun) {
        show(picture);
      }
    } catch {
      if (!shown) {
        schedule(retryDelay);
        retryDelay = Math.min(retryDelay * 2, LAST_RETRY);
      }
    }
  };

  const makeThumb = async (item: WallpaperItem) => {
    try {
      const saved = await cache.get<unknown>(THUMB_PREFIX + item.sha);
      if (isBlob(saved)) {
        return urls.create(saved);
      }
      const picture = shown && shown.sha === item.sha ? shown.blob : await download(item);
      const small = await options.scale(picture);
      await cache.put(THUMB_PREFIX + item.sha, small);
      return urls.create(small);
    } catch {
      return null;
    }
  };

  const pumpThumbs = async () => {
    if (!thumbsWanted || thumbing || disposed) {
      return;
    }
    thumbing = true;
    try {
      for (;;) {
        const next = store.getSnapshot().items.find((item) => !item.thumb && !skipped.has(item.sha));
        if (!next || disposed) {
          return;
        }
        const thumb = await makeThumb(next);
        if (!thumb) {
          skipped.add(next.sha);
        } else if (disposed || !store.getSnapshot().items.some((item) => item.sha === next.sha)) {
          urls.revoke(thumb);
        } else {
          update({
            items: store.getSnapshot().items.map((item) => (item.sha === next.sha ? { ...item, thumb } : item)),
          });
        }
      }
    } finally {
      thumbing = false;
    }
  };

  const prune = async () => {
    const keep = new Set(entries.map((entry) => THUMB_PREFIX + entry.sha));
    const keys = await cache.keys();
    await Promise.all(keys.filter((key) => key.startsWith(THUMB_PREFIX) && !keep.has(key)).map(cache.remove));
  };

  const fetchList = async () => {
    const head = await options.fetch(commitUrl(source), { headers: { Accept: "application/vnd.github.sha" } });
    const next = head.ok ? parseCommit(await head.text()) : null;
    if (!next) {
      throw new Error("GitHub did not name the latest commit.");
    }
    if (next === commit && entries.length) {
      return { commit: next, items: entries };
    }
    const response = await options.fetch(listUrl(source, next), {
      headers: { Accept: "application/vnd.github+json" },
    });
    const items = response.ok ? parseListing(await response.json()) : null;
    if (!items) {
      throw new Error("GitHub did not list the wallpapers folder.");
    }
    return { commit: next, items };
  };

  const refresh = (force = false): Promise<void> => {
    const { checkedAt } = store.getSnapshot();
    if (refreshing || disposed) {
      return refreshing || Promise.resolve();
    }
    if (!force && commit && checkedAt !== null && options.now() - checkedAt < FRESH) {
      return Promise.resolve();
    }
    update({ status: "checking", failed: null });
    refreshing = fetchList()
      .then(
        async (list) => {
          commit = list.commit;
          entries = list.items;
          const at = options.now();
          skipped.clear();
          setItems(entries);
          update({ status: "ready", checkedAt: at });
          retryDelay = FIRST_RETRY;
          schedule(RECHECK);
          await cache.put(LIBRARY_KEY, { commit, checkedAt: at, items: entries });
          void prune();
          void sync();
          void pumpThumbs();
        },
        () => {
          update({ status: options.online() ? "unavailable" : "offline" });
          schedule(retryDelay);
          retryDelay = Math.min(retryDelay * 2, LAST_RETRY);
        },
      )
      .then(() => {
        refreshing = null;
      });
    return refreshing;
  };

  const choose = async (name: string) => {
    if (!isPictureChoice(name)) {
      update({ pending: null, failed: null });
      return true;
    }
    const entry = entries.find((item) => item.name === name);
    if (!entry) {
      return false;
    }
    if (shown && shown.name === name && shown.sha === entry.sha) {
      update({ pending: null, failed: null });
      return true;
    }
    update({ pending: name, failed: null });
    try {
      const blob = await download(entry);
      const picture = { name, sha: entry.sha, blob };
      await cache.put(PICTURE_KEY, picture);
      if (store.getSnapshot().pending !== name) {
        return false;
      }
      staged = picture;
      update({ pending: null });
      return true;
    } catch {
      if (store.getSnapshot().pending === name) {
        update({ pending: null, failed: name });
      }
      return false;
    }
  };

  let lastChoice = choice.getSnapshot();
  const unsubscribe = choice.subscribe(() => {
    const next = choice.getSnapshot();
    if (next !== lastChoice) {
      lastChoice = next;
      void sync();
    }
  });
  void cache.get<unknown>(LIBRARY_KEY).then(async (saved) => {
    if (disposed) {
      return;
    }
    if (isSavedLibrary(saved) && !commit) {
      commit = saved.commit;
      entries = saved.items;
      setItems(entries);
      update({ status: "ready", checkedAt: saved.checkedAt });
    }
    await sync();
    const age = isSavedLibrary(saved) ? options.now() - saved.checkedAt : Infinity;
    if (age >= RECHECK) {
      void refresh(true);
    } else {
      schedule(RECHECK - age);
    }
  });

  return {
    getSnapshot: store.getSnapshot,
    subscribe: store.subscribe,
    choose,
    refresh,
    pictureUrl(name) {
      return commit ? pictureUrls(source, commit, name)[0] : null;
    },
    showThumbs() {
      thumbsWanted = true;
      void pumpThumbs();
    },
    dispose() {
      disposed = true;
      timers.clearTimeout(timer);
      unsubscribe();
      const { current, items } = store.getSnapshot();
      [current, ...items.map((item) => item.thumb)].forEach((url) => url && urls.revoke(url));
    },
  };
};
