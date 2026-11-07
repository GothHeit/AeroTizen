import { House, Search, Settings, TextSearch } from "lucide-preact";

import { useStore } from "../../../shared/hooks/useStore";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import type { HomeEnvironment } from "../../types";
import { SoftBackdrop } from "../SoftBackdrop/SoftBackdrop";

import { RailInput } from "./RailInput";
import { RailItem } from "./RailItem";
import styles from "./SideRail.module.css";

/**
 * Left-edge dock for everything that is not an app: Settings, search, inputs and Samsung Home.
 * Its glass is a pre-blurred copy of the Home picture lined up with the screen, so the TV
 * never runs a live blur. The copy is painted only while the dock is open.
 */
export const SideRail = ({ env, image = null }: { env: HomeEnvironment; image?: string | null }) => {
  const { t } = useTranslation();
  const { rail } = useStore(env.state);
  const { inputs } = useStore(env.inventory);
  const { unread } = useStore(env.updates);
  const open = rail !== null;
  return (
    <>
      <div class={styles.dim} data-side-rail-dim data-open={open ? "true" : "false"} />
      <nav class={styles.rail} data-side-rail data-open={open ? "true" : "false"} aria-hidden={!open}>
        <div class={styles.glass} aria-hidden="true">
          <div class={styles.picture}>
            <SoftBackdrop image={open ? image : null} shown />
          </div>
        </div>
        <RailItem env={env} controlKey="gear" icon={Settings} title={t("common.settings")} open={open}>
          {unread ? <span class={styles.notice} data-home-update-notice aria-hidden="true" /> : null}
        </RailItem>
        <RailItem env={env} controlKey="find" icon={TextSearch} title={t("home.findApp")} open={open} />
        <RailItem env={env} controlKey="search" icon={Search} title={t("home.search")} open={open} />
        {inputs.length ? <div class={styles.rule} /> : null}
        {inputs.map((source) => (
          <RailInput key={source.type + ":" + source.number} env={env} source={source} open={open} />
        ))}
        <div class={styles.rule} />
        <RailItem
          env={env}
          controlKey="samsung-home-shortcut"
          icon={House}
          title={t("common.samsungHome")}
          open={open}
        />
      </nav>
    </>
  );
};
