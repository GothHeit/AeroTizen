import { useTranslation } from "../../shared/i18n/useTranslation";
import { ChoiceGroup } from "../components/ChoiceGroup";
import { SettingsHint } from "../components/SettingsHint/SettingsHint";
import { SettingsSection } from "../components/SettingsSection/SettingsSection";
import type { InterfaceStyle, SettingsSectionProps } from "../types";

const APPEARANCE_OPTIONS = [
  { value: "classic", labelKey: "appearance.classic" },
  { value: "glass", labelKey: "appearance.glass" },
  { value: "cinema", labelKey: "appearance.cinema" },
] as const;

const HOME_CARD_COLUMNS_OPTIONS = [
  { value: "5", labelKey: "appearance.small" },
  { value: "4", labelKey: "appearance.medium" },
  { value: "3", labelKey: "appearance.large" },
] as const;

const HOME_APP_LAYOUT_OPTIONS = [
  { value: "grid", labelKey: "appearance.grid" },
  { value: "scroll", labelKey: "appearance.scroll" },
] as const;

const SCREENSAVER_OPTIONS = [
  { value: "0", labelKey: "common.off" },
  { value: "5", labelKey: "appearance.minutes5" },
  { value: "15", labelKey: "appearance.minutes15" },
  { value: "60", labelKey: "appearance.hour1" },
] as const;

const ON_OFF_OPTIONS = [
  { value: true, labelKey: "common.on" },
  { value: false, labelKey: "common.off" },
] as const;

const interfaceStyle = ({ cinemaUi, glassSettings }: SettingsSectionProps["settings"]): InterfaceStyle => {
  if (cinemaUi) {
    return "cinema";
  }
  return glassSettings ? "glass" : "classic";
};

export const AppearanceSettings = ({ settings, actions }: SettingsSectionProps) => {
  const { t } = useTranslation();
  return (
    <>
      <SettingsSection title={t("appearance.title")}>
        <ChoiceGroup
          id="settings-appearance"
          label={t("appearance.title")}
          value={interfaceStyle(settings)}
          options={APPEARANCE_OPTIONS}
          onSelect={actions.setInterfaceStyle}
        />
      </SettingsSection>
      {settings.cinemaUi ? (
        <>
          <SettingsSection title={t("appearance.screensaver")}>
            <ChoiceGroup
              id="screensaver-minutes"
              label={t("appearance.screensaver")}
              value={String(settings.screensaverMinutes)}
              options={SCREENSAVER_OPTIONS}
              onSelect={(value) => actions.setScreensaverMinutes(Number(value))}
            />
            <SettingsHint>{t("appearance.screensaverHint")}</SettingsHint>
          </SettingsSection>
          <SettingsSection title={t("appearance.nightDim")}>
            <ChoiceGroup
              id="night-dim"
              label={t("appearance.nightDim")}
              value={settings.nightDim}
              options={ON_OFF_OPTIONS}
              onSelect={actions.setNightDim}
            />
            <SettingsHint>{t("appearance.nightDimHint")}</SettingsHint>
          </SettingsSection>
        </>
      ) : null}
      {/* Cinema always shows rows of six wide tiles, so size and layout would do nothing there. */}
      {settings.cinemaUi ? null : (
        <>
          <SettingsSection title={t("appearance.size")}>
            <ChoiceGroup
              id="home-card-columns"
              label={t("appearance.size")}
              value={String(settings.homeCardColumns)}
              options={HOME_CARD_COLUMNS_OPTIONS}
              onSelect={(value) => actions.setHomeCardColumns(Number(value))}
            />
          </SettingsSection>
          <SettingsSection title={t("appearance.homeLayout")}>
            <ChoiceGroup
              id="home-app-layout"
              label={t("appearance.homeLayout")}
              value={settings.homeAppLayout}
              options={HOME_APP_LAYOUT_OPTIONS}
              onSelect={actions.setHomeAppLayout}
            />
          </SettingsSection>
        </>
      )}
    </>
  );
};
