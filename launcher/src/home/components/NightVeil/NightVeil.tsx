import { useEffect, useState } from "preact/hooks";

import styles from "./NightVeil.module.css";

// Night runs across midnight: from 23:00 until 07:00.
const NIGHT_START = 23;
const NIGHT_END = 7;

export const isNight = (hour: number) => hour >= NIGHT_START || hour < NIGHT_END;

/**
 * One translucent black layer over the Cinema Home at night. No filters, so it composites
 * cheaply; apps and inputs are never dimmed. Adapted from SompLy's auto night dim.
 */
export const NightVeil = ({ enabled }: { enabled: boolean }) => {
  const [night, setNight] = useState(() => isNight(new Date().getHours()));
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    const check = () => setNight(isNight(new Date().getHours()));
    check();
    const timer = window.setInterval(check, 60000);
    return () => window.clearInterval(timer);
  }, [enabled]);
  return <div class={styles.veil} data-night-veil data-on={enabled && night ? "true" : "false"} aria-hidden="true" />;
};
