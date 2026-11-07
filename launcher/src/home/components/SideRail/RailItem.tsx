import type { LucideIcon } from "lucide-preact";
import type { ComponentChildren } from "preact";

import { Icon } from "../../../shared/icons/Icon/Icon";
import type { HomeEnvironment } from "../../types";
import { HomeControl } from "../HomeControl/HomeControl";

import styles from "./SideRail.module.css";

export const RailItem = ({
  env,
  controlKey,
  icon,
  title,
  open,
  children,
}: {
  env: HomeEnvironment;
  controlKey: string;
  icon: LucideIcon;
  title: string;
  open: boolean;
  children?: ComponentChildren;
}) => (
  <HomeControl env={env} controlKey={controlKey} className={styles.item} title={title} registered={open}>
    <Icon icon={icon} />
    <span class={styles.label}>{title}</span>
    {children}
  </HomeControl>
);
