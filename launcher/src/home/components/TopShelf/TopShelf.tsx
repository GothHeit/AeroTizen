import { useEffect, useState } from "preact/hooks";

import type { InstalledApp } from "../../../contracts/launcher";
import { useStore } from "../../../shared/hooks/useStore";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import type { ShelfFeature } from "../../presentation/shelf";
import { cssUrl, getContinueFeature, getPinnedWallpaper, getShelfImage } from "../../presentation/shelf";
import type { HomeEnvironment } from "../../types";

import styles from "./TopShelf.module.css";

// Titles longer than this drop to the smaller size so two lines hold most real names.
const LONG_TITLE = 26;

interface ShelfChoice {
  readonly feature: ShelfFeature;
  /** Pictures to try in order; a programme's artwork falls back to the app's own picture. */
  readonly images: readonly string[];
}

const selectFeature = (
  env: HomeEnvironment,
  app: InstalledApp,
  continueLabel: string,
  showContinue: boolean,
  formatEpisode: (season: number, episode: number) => string,
): ShelfChoice => {
  const brand = env.describe(app);
  const appImage = getShelfImage(app);
  const item = showContinue ? env.inventory.getSnapshot().items.find((entry) => entry.sourceId === app.id) : null;
  if (item) {
    const feature = getContinueFeature(item, formatEpisode);
    return {
      feature: { ...feature, title: feature.title || brand.title, kicker: brand.title + " · " + continueLabel },
      images: [feature.image, appImage].filter((image): image is string => Boolean(image)),
    };
  }
  return {
    feature: { image: appImage, kicker: "", title: brand.title, detail: null, progress: null },
    images: appImage ? [appImage] : [],
  };
};

/** The first picture in the list that actually loads; broken artwork never leaves a blank shelf. */
const useLoadedImage = (images: readonly string[]) => {
  const key = images.join("\n");
  const [loaded, setLoaded] = useState<{ key: string; src: string | null }>({ key: "", src: null });
  useEffect(() => {
    const list = key ? key.split("\n") : [];
    let current = true;
    let probe: HTMLImageElement | null = null;
    const attempt = (index: number) => {
      if (index >= list.length) {
        setLoaded({ key, src: null });
        return;
      }
      probe = new Image();
      probe.onload = () => current && setLoaded({ key, src: list[index] });
      probe.onerror = () => current && attempt(index + 1);
      probe.src = list[index];
    };
    attempt(0);
    return () => {
      current = false;
      if (probe) {
        probe.onload = null;
        probe.onerror = null;
      }
    };
  }, [key]);
  // Keep showing the last good picture until the next one is ready, instead of flashing black.
  return loaded.src;
};

/** Full-bleed artwork for the focused top-row app. Static images only; no live blur. */
export const TopShelf = ({
  env,
  app,
  open,
  covered,
  empty,
}: {
  env: HomeEnvironment;
  app: InstalledApp | null;
  open: boolean;
  covered: boolean;
  empty: boolean;
}) => {
  const { t } = useTranslation();
  const settings = useStore(env.settings);
  useStore(env.inventory);
  const { current } = useStore(env.runtime.wallpapers);
  const chosen = app
    ? selectFeature(env, app, t("home.continueWatching"), settings.continueWatching, (season, episode) =>
        t("continue.episode", { season, episode }),
      )
    : null;
  // A pinned wallpaper stays put while the title and progress follow the focused app.
  // It also stays when the focused tile is not an app, such as the Fireplace; black shows nothing.
  const pinned = getPinnedWallpaper(settings.shelfWallpaper, current);
  const candidates =
    pinned === undefined ? chosen?.images || [] : [pinned].filter((image): image is string => Boolean(image));
  const image = useLoadedImage(candidates);
  const feature = chosen?.feature;
  return (
    <div class={styles.shelf} data-top-shelf data-open={open ? "true" : "false"} aria-hidden="true">
      {image ? <div key={image} class={styles.image} style={{ backgroundImage: cssUrl(image) }} /> : null}
      <div class={styles.scrim} />
      {feature ? (
        <div class={styles.meta} data-shelf-meta data-covered={covered ? "true" : "false"}>
          {feature.kicker ? <div class={styles.kicker}>{feature.kicker}</div> : null}
          <div class={styles.title} data-long={feature.title.length > LONG_TITLE ? "true" : "false"}>
            {feature.title}
          </div>
          {feature.detail ? <div class={styles.detail}>{feature.detail}</div> : null}
          {feature.progress !== null ? (
            <div class={styles.progress}>
              <span style={{ width: Math.round(feature.progress * 100) + "%" }} />
            </div>
          ) : null}
        </div>
      ) : null}
      {!feature && empty ? (
        <div class={styles.meta} data-shelf-meta data-covered={covered ? "true" : "false"}>
          <div class={styles.title}>{t("home.emptyApps")}</div>
          <div class={styles.detail}>{t("home.emptyAppsHint")}</div>
        </div>
      ) : null}
    </div>
  );
};
