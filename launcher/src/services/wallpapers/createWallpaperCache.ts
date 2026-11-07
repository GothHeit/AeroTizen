/** Key-value storage for the picture list, small copies and the chosen picture. */
export interface WallpaperCache {
  get<T>(key: string): Promise<T | undefined>;
  keys(): Promise<string[]>;
  put(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
}

const DATABASE = "aerotizen.wallpapers.v1";
const STORE = "files";

const settle = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error || new Error("IndexedDB request failed.")));
  });

/** In-memory storage for tests and for TVs where IndexedDB is unavailable. */
export const createMemoryCache = (): WallpaperCache => {
  const entries = new Map<string, unknown>();
  return {
    get: <T>(key: string) => Promise.resolve(entries.get(key) as T | undefined),
    keys: () => Promise.resolve([...entries.keys()]),
    put(key, value) {
      entries.set(key, value);
      return Promise.resolve();
    },
    remove(key) {
      entries.delete(key);
      return Promise.resolve();
    },
  };
};

/** IndexedDB keeps pictures as Blobs across restarts. Any storage error falls back to memory for this run. */
export const createWallpaperCache = (factory: IDBFactory | undefined): WallpaperCache => {
  const memory = createMemoryCache();
  const opened = new Promise<IDBDatabase | null>((resolve) => {
    if (!factory) {
      resolve(null);
      return;
    }
    try {
      const request = factory.open(DATABASE, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  const run = async <T>(
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest<T>,
    fallback: () => Promise<T>,
  ) => {
    const database = await opened;
    if (!database) {
      return fallback();
    }
    try {
      return await settle(action(database.transaction(STORE, mode).objectStore(STORE)));
    } catch {
      return fallback();
    }
  };
  return {
    get: <T>(key: string) =>
      run<T | undefined>(
        "readonly",
        (store) => store.get(key) as IDBRequest<T | undefined>,
        () => memory.get<T>(key),
      ),
    keys: () =>
      run(
        "readonly",
        (store) => store.getAllKeys(),
        () => memory.keys(),
      ).then((keys) => keys.map(String)),
    put: (key, value) =>
      run(
        "readwrite",
        (store) => store.put(value, key),
        () => memory.put(key, value).then(() => key),
      ).then(() => undefined),
    remove: (key) =>
      run(
        "readwrite",
        (store) => store.delete(key) as IDBRequest<unknown>,
        () => memory.remove(key) as Promise<unknown>,
      ).then(() => undefined),
  };
};
