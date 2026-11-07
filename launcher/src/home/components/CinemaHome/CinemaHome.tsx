import { useLayoutEffect, useRef } from "preact/hooks";

import { useStore } from "../../../shared/hooks/useStore";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import { HeaderStatus } from "../../../status/HeaderStatus/HeaderStatus";
import { getPinnedWallpaper, getShelfImage } from "../../presentation/shelf";
import type { HomeEnvironment } from "../../types";
import { AppActionsMenu } from "../AppActionsMenu/AppActionsMenu";
import { CinemaTiles } from "../CinemaTiles/CinemaTiles";
import { FindBar } from "../FindBar/FindBar";
import { SideRail } from "../SideRail/SideRail";
import { SoftBackdrop } from "../SoftBackdrop/SoftBackdrop";
import { TopShelf } from "../TopShelf/TopShelf";

import styles from "./CinemaHome.module.css";

const TOP_ROW = 6;
// Two hand-tuned moves: the long drop between the Top Shelf and the grid, and a row-to-row step.
const SHELF_MOVE = "var(--motion-duration-viewport)";
const ROW_MOVE = "var(--motion-duration-scroll)";

/** Apple TV-style Home: a Top Shelf over one row of favourites, then every other app. */
export const CinemaHome = ({ env }: { env: HomeEnvironment }) => {
  const { t } = useTranslation();
  const settings = useStore(env.settings);
  const { active, draft, find, rail, scroll, selected, typing } = useStore(env.state);
  const { apps, inputs, items, ready } = useStore(env.inventory);
  const saved = draft || (settings.homeInitialized ? settings.home : [env.runtime.config.FIREPLACE_ID]);
  const home = saved.filter(
    (id) => id === env.runtime.config.FIREPLACE_ID || !ready || apps.some((app) => app.id === id),
  );
  const others = apps.map((app) => app.id).filter((id) => !home.includes(id));
  // "Find an app" shows only the apps whose name holds the typed text, in the same order.
  const query = (find || "").trim().toLowerCase();
  const found =
    find === null
      ? []
      : [...home, ...others].filter((id) => {
          const app = apps.find((entry) => entry.id === id);
          return Boolean(app) && (!query || app!.name.toLowerCase().includes(query));
        });
  // With no favourites, every app moves up into the top row's place under the shelf.
  const grid = home.length ? { first: home, rest: others } : { first: others, rest: [] as string[] };
  const firstIds = find === null ? grid.first : found;
  const restIds = find === null ? grid.rest : [];
  const topRow = firstIds.slice(0, TOP_ROW).map((id) => "app:" + id);
  const shelfKey = topRow.includes(rail ?? selected) ? (rail ?? selected) : topRow[0];
  const shelfApp = shelfKey ? apps.find((app) => "app:" + app.id === shelfKey) || null : null;
  const { current } = useStore(env.runtime.wallpapers);
  const pinned = getPinnedWallpaper(settings.shelfWallpaper, current);
  const shelfImage = shelfApp ? getShelfImage(shelfApp) : null;
  const backdrop = pinned === undefined ? shelfImage : pinned;
  const previous = useRef(scroll);
  const crossesShelf = (previous.current === 0) !== (scroll === 0);
  previous.current = scroll;
  useLayoutEffect(() => {
    env.bridge.focus();
  }, [env, apps, inputs, items, ready, settings.home, settings.homeInitialized, draft, find]);
  return (
    <div class={styles.home} data-home data-cinema-home>
      <div class={styles.base} />
      <SoftBackdrop image={backdrop} shown={scroll > 0} />
      <TopShelf env={env} app={shelfApp} open={scroll === 0} covered={rail !== null} empty={ready && !apps.length} />
      {/* The clock steps aside in the grid, where scrolled rows pass beneath it. */}
      <div class={styles.status} data-cinema-status data-shown={scroll === 0 ? "true" : "false"} aria-hidden={!active}>
        <HeaderStatus settings={env.settings} status={env.status} clock={env.runtime.clock} />
      </div>
      <div class={styles.viewport} data-home-viewport aria-hidden={!active}>
        <main
          id="rows"
          class={styles.rows}
          data-home-content
          ref={env.rows}
          style={{
            transform: "translate3d(0, " + -scroll + "px, 0)",
            transitionDuration: crossesShelf ? SHELF_MOVE : ROW_MOVE,
          }}
        >
          <CinemaTiles env={env} ids={firstIds} apps={apps} active={active && !typing} />
          {restIds.length ? (
            <section class={styles.section}>
              <h2 class={styles.heading}>{t("home.allApps")}</h2>
              <CinemaTiles env={env} ids={restIds} apps={apps} active={active} />
            </section>
          ) : null}
        </main>
      </div>
      {find !== null ? <FindBar env={env} text={find} typing={typing} matches={found.length} /> : null}
      <SideRail env={env} image={backdrop} />
      <AppActionsMenu env={env} />
    </div>
  );
};
