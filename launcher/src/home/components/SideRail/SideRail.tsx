import { House, Settings } from "lucide-preact";

import { useStore } from "../../../shared/hooks/useStore";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import type { HomeEnvironment } from "../../types";

import { RailInput } from "./RailInput";
import { RailItem } from "./RailItem";
import styles from "./SideRail.module.css";

/** Left-edge panel for everything that is not an app: Settings, inputs and Samsung Home. */
export const SideRail = ({ env }: { env: HomeEnvironment }) => {
  const { t } = useTranslation();
  const { rail } = useStore(env.state);
  const { inputs } = useStore(env.inventory);
  const { unread } = useStore(env.updates);
  const open = rail !== null;
  return (
    <>
      <div class={styles.dim} data-side-rail-dim data-open={open ? "true" : "false"} />
      <nav class={styles.rail} data-side-rail data-open={open ? "true" : "false"} aria-hidden={!open}>
        <RailItem env={env} controlKey="gear" icon={Settings} title={t("common.settings")} open={open}>
          {unread ? <span class={styles.notice} data-home-update-notice aria-hidden="true" /> : null}
        </RailItem>
        {inputs.length ? <h2 class={styles.heading}>{t("common.inputs")}</h2> : null}
        {inputs.map((source) => (
          <RailInput key={source.type + ":" + source.number} env={env} source={source} open={open} />
        ))}
        <div class={styles.spacer} />
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
