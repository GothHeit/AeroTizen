import { Image, LayoutGrid, RefreshCw } from "lucide-preact";
import { useEffect } from "preact/hooks";

import type { WallpaperLibraryState } from "../../../../contracts/wallpapers";
import { isPictureChoice, SHELF_BLACK } from "../../../../contracts/wallpapers";
import { useStore } from "../../../../shared/hooks/useStore";
import type { MessageKey } from "../../../../shared/i18n/catalogues";
import { useTranslation } from "../../../../shared/i18n/useTranslation";
import { Icon } from "../../../../shared/icons/Icon/Icon";
import { SettingsControl } from "../../../components/SettingsControl/SettingsControl";
import { SettingsSection } from "../../../components/SettingsSection/SettingsSection";
import { useSettingsEnvironment } from "../../../hooks/useSettingsEnvironment";

import styles from "./ShelfPicturePicker.module.css";
import { ShelfPictureTile } from "./ShelfPictureTile";

const PLAIN_CHOICES = [
  { value: SHELF_BLACK, labelKey: "wallpaper.shelfBlack", tone: "black", icon: null },
  { value: "", labelKey: "wallpaper.shelfEachApp", tone: "each", icon: LayoutGrid },
] as const;

const STATUS = {
  checking: { messageKey: "wallpaper.shelfChecking", tone: "busy" },
  ready: { messageKey: "wallpaper.shelfCount", tone: "good" },
  offline: { messageKey: "wallpaper.shelfOffline", tone: "warn" },
  unavailable: { messageKey: "wallpaper.shelfUnavailable", tone: "warn" },
} as const;

/** A failed download outranks the list's state; an empty folder gets its own hint. */
const describeLibrary = ({
  failed,
  items,
  status,
}: WallpaperLibraryState): { messageKey: MessageKey; tone: string } => {
  if (failed) {
    return { messageKey: "wallpaper.shelfFailed", tone: "warn" };
  }
  if (status === "ready" && !items.length) {
    return { messageKey: "wallpaper.shelfEmpty", tone: "warn" };
  }
  return STATUS[status];
};

/** Cinema's Top Shelf picture: plain black, each app's own art, or one picture from GitHub. */
export const ShelfPicturePicker = ({ choice, onChoose }: { choice: string; onChoose(value: string): void }) => {
  const { t } = useTranslation();
  const { drawer, services } = useSettingsEnvironment();
  const { wallpapers } = services;
  const library = useStore(wallpapers);
  const { category } = useStore(drawer);
  const shown = category === "wallpaper";
  useEffect(() => {
    if (shown) {
      void wallpapers.refresh();
      wallpapers.showThumbs();
    }
  }, [shown, wallpapers]);
  const pick = (value: string) => {
    if (!isPictureChoice(value)) {
      void wallpapers.choose(value);
      onChoose(value);
      return;
    }
    // The picture is saved on the TV before it becomes the choice, so the shelf never goes blank.
    void wallpapers.choose(value).then((ready) => {
      if (ready) {
        onChoose(value);
      }
    });
  };
  const status = describeLibrary(library);
  return (
    <SettingsSection title={t("wallpaper.shelf")} description={t("wallpaper.shelfHint")}>
      <div id="shelf-wallpapers" class={styles.grid} data-shelf-pictures>
        {PLAIN_CHOICES.map((option) => (
          <ShelfPictureTile
            key={option.labelKey}
            value={option.value}
            label={t(option.labelKey)}
            tone={option.tone}
            selected={choice === option.value}
            onSelect={() => pick(option.value)}
          >
            {option.icon ? <Icon icon={option.icon} /> : null}
            <span class={styles.plainLabel}>{t(option.labelKey)}</span>
          </ShelfPictureTile>
        ))}
        {library.items.map((item) => (
          <ShelfPictureTile
            key={item.name}
            value={item.name}
            label={item.name}
            thumb={item.thumb}
            selected={choice === item.name}
            pending={library.pending === item.name}
            onSelect={() => pick(item.name)}
          >
            {item.thumb ? null : <Icon icon={Image} />}
          </ShelfPictureTile>
        ))}
      </div>
      <div class={styles.footer}>
        <p class={styles.status} data-shelf-status={status.tone} role="status">
          <span class={styles.dot} aria-hidden="true" />
          {t(status.messageKey, { count: library.items.length })}
        </p>
        <SettingsControl
          class={styles.refresh}
          focusKey="shelf-wallpaper-refresh"
          role="button"
          aria-disabled={library.status === "checking"}
          onClick={() => void wallpapers.refresh(true)}
        >
          <Icon icon={RefreshCw} />
          {t("wallpaper.shelfRefresh")}
        </SettingsControl>
      </div>
    </SettingsSection>
  );
};
