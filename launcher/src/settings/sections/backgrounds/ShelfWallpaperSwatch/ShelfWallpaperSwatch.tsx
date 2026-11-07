import { SelectionIndicator } from "../../../components/SelectionIndicator/SelectionIndicator";
import { SettingsControl } from "../../../components/SettingsControl/SettingsControl";
import swatch from "../WallpaperSwatch/WallpaperSwatch.module.css";

import styles from "./ShelfWallpaperSwatch.module.css";

interface Props {
  focusKey: string;
  label: string;
  onSelect(): void;
  selected: boolean;
  /** Small copy of the picture; null shows the "each app" tile. */
  thumb: string | null;
}

/** One Top Shelf wallpaper choice. Uses a small thumbnail so the list stays light on TV memory. */
export const ShelfWallpaperSwatch = ({ focusKey, label, onSelect, selected, thumb }: Props) => (
  <SettingsControl
    class={swatch.swatch + " " + styles.picture}
    data-shelf-wallpaper
    focusKey={focusKey}
    role="button"
    aria-pressed={selected}
    style={thumb ? { backgroundImage: "url(" + thumb + ")" } : undefined}
    onClick={onSelect}
  >
    <span class={swatch.caption}>
      <span class={swatch.label}>{label}</span>
    </span>
    {selected ? <SelectionIndicator small /> : null}
  </SettingsControl>
);
