import type { InstalledApp } from "../../../contracts/launcher";
import { useStore } from "../../../shared/hooks/useStore";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import type { ShelfFeature } from "../../presentation/shelf";
import { getContinueFeature, getShelfImage } from "../../presentation/shelf";
import type { HomeEnvironment } from "../../types";

import styles from "./TopShelf.module.css";

const selectFeature = (
  env: HomeEnvironment,
  app: InstalledApp,
  continueLabel: string,
  showContinue: boolean,
): ShelfFeature => {
  const brand = env.describe(app);
  const item = showContinue ? env.inventory.getSnapshot().items.find((entry) => entry.sourceId === app.id) : null;
  if (item) {
    const feature = getContinueFeature(item);
    return { ...feature, image: feature.image || getShelfImage(app), kicker: brand.title + " · " + continueLabel };
  }
  return { image: getShelfImage(app), kicker: "", title: brand.title, detail: null, progress: null };
};

/** Full-bleed artwork for the focused top-row app. Static images only; no live blur. */
export const TopShelf = ({
  env,
  app,
  open,
  covered,
}: {
  env: HomeEnvironment;
  app: InstalledApp | null;
  open: boolean;
  covered: boolean;
}) => {
  const { t } = useTranslation();
  const settings = useStore(env.settings);
  useStore(env.inventory);
  const feature = app ? selectFeature(env, app, t("home.continueWatching"), settings.continueWatching) : null;
  return (
    <div class={styles.shelf} data-top-shelf data-open={open ? "true" : "false"} aria-hidden="true">
      {feature?.image ? (
        <div key={feature.image} class={styles.image} style={{ backgroundImage: "url(" + feature.image + ")" }} />
      ) : null}
      <div class={styles.scrim} />
      {feature ? (
        <div class={styles.meta} data-shelf-meta data-covered={covered ? "true" : "false"}>
          {feature.kicker ? <div class={styles.kicker}>{feature.kicker}</div> : null}
          <div class={styles.title}>{feature.title}</div>
          {feature.detail ? <div class={styles.detail}>{feature.detail}</div> : null}
          {feature.progress !== null ? (
            <div class={styles.progress}>
              <span style={{ width: Math.round(feature.progress * 100) + "%" }} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
