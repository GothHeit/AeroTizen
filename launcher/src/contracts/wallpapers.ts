import type { Store } from "../shared/state/createStore";

/** Top Shelf choices that are not pictures: "" lets each app show its own art; this one is plain black. */
export const SHELF_BLACK = "black";

export const isPictureChoice = (choice: string) => choice !== "" && choice !== SHELF_BLACK;

/** One picture in the wallpapers folder on GitHub. */
export interface WallpaperItem {
  /** File name, which is also the saved setting value. */
  readonly name: string;
  /** Git blob id: changes when the file's contents change. */
  readonly sha: string;
  /** Object URL of a small copy made on the TV, or null until it exists. */
  readonly thumb: string | null;
}

/**
 * - checking: asking GitHub for the list.
 * - ready: the list is current.
 * - offline: the TV has no connection; the saved list and picture are used.
 * - unavailable: GitHub or the CDN refused or failed; the saved list and picture are used.
 */
export type WallpaperLibraryStatus = "checking" | "ready" | "offline" | "unavailable";

export interface WallpaperLibraryState {
  readonly checkedAt: number | null;
  /** Object URL of the chosen picture, ready to paint, or null while it is missing. */
  readonly current: string | null;
  /** A picture that could not be downloaded after the user picked it. */
  readonly failed: string | null;
  readonly items: readonly WallpaperItem[];
  /** A picture the user picked that is still downloading. */
  readonly pending: string | null;
  readonly status: WallpaperLibraryStatus;
}

export interface WallpaperLibrary extends Store<WallpaperLibraryState> {
  /** Downloads and saves a picture before it is chosen. Resolves false when it cannot be fetched. */
  choose(name: string): Promise<boolean>;
  dispose(): void;
  /** The CDN link to a listed picture, or null before the list is known. Not saved on the TV. */
  pictureUrl(name: string): string | null;
  /** Asks GitHub for the list. Without force, a recent answer is reused. */
  refresh(force?: boolean): Promise<void>;
  /** Makes small copies for the picker, one picture at a time. */
  showThumbs(): void;
}
