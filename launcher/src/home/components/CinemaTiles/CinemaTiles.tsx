import type { InstalledApp } from "../../../contracts/launcher";
import type { HomeEnvironment } from "../../types";
import { AppCard } from "../AppCard";
import { FireplaceCard } from "../FireplaceCard/FireplaceCard";

import styles from "./CinemaTiles.module.css";

/** Wide app tiles in rows of six for the Cinema layout. */
export const CinemaTiles = ({
  env,
  ids,
  apps,
  active,
}: {
  env: HomeEnvironment;
  ids: readonly string[];
  apps: readonly InstalledApp[];
  active: boolean;
}) => (
  <div class={styles.grid} data-app-grid data-cinema-grid>
    {ids.map((id) => {
      if (id === env.runtime.config.FIREPLACE_ID) {
        return <FireplaceCard key={id} env={env} registered />;
      }
      const app = apps.find((entry) => entry.id === id) || { id, name: id, icon: "" };
      return <AppCard key={id} env={env} app={app} active={active} />;
    })}
  </div>
);
