import { TextSearch } from "lucide-preact";
import { useLayoutEffect, useRef } from "preact/hooks";

import { useTranslation } from "../../../shared/i18n/useTranslation";
import { Icon } from "../../../shared/icons/Icon/Icon";
import type { HomeEnvironment } from "../../types";

import styles from "./FindBar.module.css";

/**
 * Cinema "Find an app": one field over the Top Shelf. Typing narrows the grid live; the TV
 * keyboard opens while the field has focus. Adapted from SompLy's All apps search.
 */
export const FindBar = ({
  env,
  text,
  typing,
  matches,
}: {
  env: HomeEnvironment;
  text: string;
  typing: boolean;
  matches: number;
}) => {
  const { t } = useTranslation();
  const field = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    const input = field.current;
    if (!input) {
      return;
    }
    if (typing && document.activeElement !== input) {
      input.focus();
    } else if (!typing && document.activeElement === input) {
      input.blur();
    }
  }, [typing]);
  return (
    <div class={styles.find} data-find-bar data-typing={typing ? "true" : "false"}>
      <div class={styles.field}>
        <Icon icon={TextSearch} />
        <input
          ref={field}
          id="app-find"
          class={styles.input}
          type="text"
          value={text}
          placeholder={t("home.findHint")}
          autocomplete="off"
          spellcheck={false}
          onInput={(event) => env.findText(event.currentTarget.value)}
        />
      </div>
      {text.trim() && !matches ? <div class={styles.none}>{t("home.findNone")}</div> : null}
    </div>
  );
};
