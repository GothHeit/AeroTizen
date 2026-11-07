import { useLayoutEffect } from "preact/hooks";

import { useStore } from "../../../shared/hooks/useStore";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import { HeaderStatus } from "../../../status/HeaderStatus/HeaderStatus";
import { getShelfImage } from "../../presentation/shelf";
import type { HomeEnvironment } from "../../types";
import { AppActionsMenu } from "../AppActionsMenu/AppActionsMenu";
import { CinemaTiles } from "../CinemaTiles/CinemaTiles";
import { SideRail } from "../SideRail/SideRail";
import { SoftBackdrop } from "../SoftBackdrop/SoftBackdrop";
import { TopShelf } from "../TopShelf/TopShelf";

import styles from "./CinemaHome.module.css";

const TOP_ROW = 6;

/** Apple TV-style Home: a Top Shelf over one row of favourites, then every other app. */
export const CinemaHome = ({ env }: { env: HomeEnvironment }) => {
  const { t } = useTranslation();
  const settings = useStore(env.settings);
  const { active, draft, rail, scroll, selected } = useStore(env.state);
  const { apps, inputs, items, ready } = useStore(env.inventory);
  const saved = draft || (settings.homeInitialized ? settings.home : [env.runtime.config.FIREPLACE_ID]);
  const home = saved.filter(
    (id) => id === env.runtime.config.FIREPLACE_ID || !ready || apps.some((app) => app.id === id),
  );
  const others = apps.map((app) => app.id).filter((id) => !home.includes(id));
  const topRow = home.slice(0, TOP_ROW).map((id) => "app:" + id);
  const shelfKey = topRow.includes(rail ?? selected) ? (rail ?? selected) : topRow[0];
  const shelfApp = shelfKey ? apps.find((app) => "app:" + app.id === shelfKey) || null : null;
  const backdrop = shelfApp ? getShelfImage(shelfApp) : null;
  useLayoutEffect(() => {
    env.bridge.focus();
  }, [env, apps, inputs, items, ready, settings.home, settings.homeInitialized, draft]);
  return (
    <div class={styles.home} data-home data-cinema-home>
      <SoftBackdrop image={backdrop} shown={scroll > 0} />
      <TopShelf env={env} app={shelfApp} open={scroll === 0} covered={rail !== null} />
      <div class={styles.status} aria-hidden={!active}>
        <HeaderStatus settings={env.settings} status={env.status} clock={env.runtime.clock} />
      </div>
      <div class={styles.viewport} data-home-viewport aria-hidden={!active}>
        <main
          id="rows"
          class={styles.rows}
          data-home-content
          ref={env.rows}
          style={{ "--home-offset": -scroll + "px" }}
        >
          <CinemaTiles env={env} ids={home} apps={apps} active={active} />
          {others.length ? (
            <section class={styles.section}>
              <h2 class={styles.heading}>{t("home.allApps")}</h2>
              <CinemaTiles env={env} ids={others} apps={apps} active={active} />
            </section>
          ) : null}
          {ready && !apps.length ? <p class={styles.empty}>{t("home.emptyApps")}</p> : null}
        </main>
      </div>
      <SideRail env={env} />
      <AppActionsMenu env={env} />
    </div>
  );
};
