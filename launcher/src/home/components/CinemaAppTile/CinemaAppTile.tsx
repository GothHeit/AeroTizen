import { useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";

import type { InstalledApp } from "../../../contracts/launcher";
import { AppFallback } from "../../../shared/components/AppFallback/AppFallback";
import { useImageSequence } from "../../../shared/hooks/useImageSequence";
import { useStore } from "../../../shared/hooks/useStore";
import textStyles from "../../../shared/styles/text.module.css";
import type { HomeEnvironment } from "../../types";
import { HomeAppCard } from "../HomeAppCard/HomeAppCard";

import type { ArtFill } from "./artFill";
import { edgeBackground, paintBlur, readArtFill } from "./artFill";
import styles from "./CinemaAppTile.module.css";

/** The blur is soft, so a small canvas stretched over the tile is enough. */
const BLUR_CANVAS = { width: 160, height: 96 };

/**
 * A full-bleed Cinema app tile. The app's art (Samsung's square store art, or the app's own icon
 * for apps without it) fills the tile height and the sides continue it, so there are no strips.
 * The name shows under the tile while it has focus, unless the tile already prints it.
 */
export const CinemaAppTile = ({ env, app, active }: { env: HomeEnvironment; app: InstalledApp; active: boolean }) => {
  const brand = useMemo(() => env.describe(app), [env, app]);
  // The icon becomes the art here, so the fallback shows only the brand logo or name meanwhile.
  const fallbackBrand = useMemo(() => ({ ...brand, useAppIcon: false }), [brand]);
  const sources = useMemo(
    () =>
      brand.useAppIcon && app.icon && !brand.artwork.includes(app.icon) ? [...brand.artwork, app.icon] : brand.artwork,
    [brand, app.icon],
  );
  const art = useImageSequence(sources, active);
  const [measured, setMeasured] = useState<Readonly<{ src: string; fill: ArtFill }> | null>(null);
  const fill = art.loaded && measured && measured.src === art.src ? measured.fill : null;
  const image = useRef<HTMLImageElement | null>(null);
  const blur = useRef<HTMLCanvasElement | null>(null);

  useLayoutEffect(() => {
    if (fill?.kind === "blur" && blur.current && image.current) {
      paintBlur(blur.current, image.current);
    }
  }, [fill]);

  const { moving, active: homeActive, selected } = useStore(env.state);
  const focused = active && homeActive && selected === "app:" + app.id;
  const printsName = !fill && (!!brand.label || !brand.logoPath);
  const inset = fill?.kind === "blur" && fill.inset;

  return (
    <div class={styles.tile} data-cinema-tile>
      <HomeAppCard
        env={env}
        id={app.id}
        registered={active}
        title={brand.title}
        background={fill ? edgeBackground(fill) || "#000" : brand.background}
      >
        {fill?.kind === "blur" ? (
          <canvas
            ref={blur}
            class={styles.blur}
            width={BLUR_CANVAS.width}
            height={BLUR_CANVAS.height}
            aria-hidden="true"
          />
        ) : null}
        <AppFallback app={app} brand={fallbackBrand} active={active} hidden={!!fill} />
        {art.src ? (
          <img
            key={art.src}
            ref={image}
            class={styles.art + (inset ? " " + styles.inset : "")}
            data-app-artwork
            alt=""
            src={art.src}
            hidden={!fill}
            onLoad={(event) => {
              const loaded = event.currentTarget;
              setMeasured({ src: loaded.getAttribute("src") || "", fill: readArtFill(loaded) });
              art.onLoad();
            }}
            onError={art.onError}
          />
        ) : null}
      </HomeAppCard>
      {focused && !printsName && moving !== app.id ? (
        <div class={styles.name + " " + textStyles.truncate} data-cinema-tile-name>
          {brand.title}
        </div>
      ) : null}
    </div>
  );
};
