import type { LucideIcon } from "lucide-preact";
import type { ComponentChildren } from "preact";

import { Icon } from "../../../shared/icons/Icon/Icon";
import type { HomeEnvironment } from "../../types";
import { HomeControl } from "../HomeControl/HomeControl";

import styles from "./SideRail.module.css";

/** One round dock button. Its name shows in a bubble beside it only while it has focus. */
export const RailItem = ({
  env,
  controlKey,
  icon,
  title,
  detail,
  dimmed = false,
  open,
  children,
}: {
  env: HomeEnvironment;
  controlKey: string;
  icon: LucideIcon;
  title: string;
  detail?: string;
  dimmed?: boolean;
  open: boolean;
  children?: ComponentChildren;
}) => (
  <HomeControl
    env={env}
    controlKey={controlKey}
    className={styles.item}
    title={title}
    registered={open}
    dataAttributes={dimmed ? { "data-dimmed": "true" } : undefined}
  >
    <span class={styles.disc}>
      <Icon icon={icon} />
      {children}
    </span>
    <span class={styles.bubble} aria-hidden="true">
      <span class={styles.name}>{title}</span>
      {detail ? <span class={styles.detail}>{detail}</span> : null}
    </span>
  </HomeControl>
);
