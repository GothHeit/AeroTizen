import type { LucideIcon } from "lucide-preact";
import { Gamepad2, HdmiPort, Monitor, RectangleEllipsis, Tv } from "lucide-preact";

import type { InputSource } from "../../../contracts/launcher";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import type { InputKind } from "../../presentation/inputs";
import { getInputPresentation } from "../../presentation/inputs";
import type { HomeEnvironment } from "../../types";

import { RailItem } from "./RailItem";
import styles from "./SideRail.module.css";

const INPUT_ICONS = { tv: Tv, game: Gamepad2, pc: Monitor, box: RectangleEllipsis, hdmi: HdmiPort } satisfies Record<
  InputKind,
  LucideIcon
>;

export const RailInput = ({ env, source, open }: { env: HomeEnvironment; source: InputSource; open: boolean }) => {
  const { t } = useTranslation();
  const label = env.runtime.inputs.label(source, source.type === "TV" ? t("inputs.liveTv") : undefined);
  const { kind, disconnected } = getInputPresentation(source, label, {
    recognized: Boolean(env.runtime.inputs.hasRecognizedDevice?.(source)),
    pinned: Boolean(env.runtime.inputs.alwaysVisible?.(source)),
  });
  return (
    <RailItem
      env={env}
      controlKey={"input:" + source.type + ":" + source.number}
      icon={INPUT_ICONS[kind]}
      title={label}
      open={open}
    >
      {disconnected ? <span class={styles.off} aria-hidden="true" /> : null}
    </RailItem>
  );
};
