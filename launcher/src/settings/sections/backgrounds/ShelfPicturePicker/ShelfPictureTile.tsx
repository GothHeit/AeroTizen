import type { ComponentChildren } from "preact";

import { SelectionIndicator } from "../../../components/SelectionIndicator/SelectionIndicator";
import { SettingsControl } from "../../../components/SettingsControl/SettingsControl";

import styles from "./ShelfPicturePicker.module.css";

interface Props {
  children?: ComponentChildren;
  label: string;
  onSelect(): void;
  pending?: boolean;
  selected: boolean;
  /** Small copy made on the TV; plain choices and pictures still being copied have none. */
  thumb?: string | null;
  tone?: "black" | "each";
  value: string;
}

/** One 16:9 Top Shelf choice. The frame lifts on focus; the check marks the picture in use. */
export const ShelfPictureTile = ({
  children,
  label,
  onSelect,
  pending = false,
  selected,
  thumb,
  tone,
  value,
}: Props) => (
  <SettingsControl
    class={styles.tile}
    focusKey={"shelf-wallpaper:" + value}
    role="button"
    aria-label={label}
    aria-pressed={selected}
    aria-busy={pending}
    data-shelf-picture={value}
    onClick={onSelect}
  >
    <span class={styles.frame} data-tone={tone}>
      {thumb ? <span class={styles.picture} style={{ backgroundImage: "url(" + thumb + ")" }} /> : null}
      {children ? <span class={styles.content}>{children}</span> : null}
      {pending ? <span class={styles.spinner} aria-hidden="true" /> : null}
      {selected && !pending ? <SelectionIndicator small /> : null}
    </span>
  </SettingsControl>
);
