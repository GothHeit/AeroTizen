import { useEffect, useRef, useState } from "preact/hooks";

import type { HomeEnvironment } from "../../types";

import styles from "./Screensaver.module.css";

/** How long each picture stays before the next one fades in. */
const SLIDE_MS = 20000;

/**
 * Cinema screensaver: after the Home sits idle, the Top Shelf pictures drift slowly, one
 * after another, with no clock. Any button wakes the Home and is not passed on. Opacity and
 * transform only, so it costs the TV almost nothing. Inspired by SompLy's idle screensaver.
 */
export const Screensaver = ({
  env,
  minutes,
  images,
}: {
  env: HomeEnvironment;
  minutes: number;
  images: readonly string[];
}) => {
  const [shown, setShown] = useState(false);
  const [slide, setSlide] = useState(0);
  const showing = useRef(false);
  showing.current = shown;

  useEffect(() => {
    if (!minutes) {
      setShown(false);
      return undefined;
    }
    let timer: number | undefined;
    let waking = false;
    // Only an idle Home counts: never over Settings, an input, the Fireplace or an app.
    const idle = () =>
      !document.hidden &&
      !env.runtime.settingsUi?.isOpen() &&
      !env.runtime.inputs.watching &&
      !env.runtime.inputs.peeking &&
      !window.Fireplace?.isOpen() &&
      !env.state.getSnapshot().typing &&
      !env.state.getSnapshot().menu &&
      !env.state.getSnapshot().moving;
    const arm = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (idle()) {
          setSlide(0);
          setShown(true);
        } else {
          arm();
        }
      }, minutes * 60000);
    };
    const key = (event: KeyboardEvent) => {
      if (showing.current) {
        // The button that wakes the Home does nothing else, including its release.
        event.preventDefault();
        event.stopPropagation();
        waking = true;
        setShown(false);
      }
      arm();
    };
    const keyup = (event: KeyboardEvent) => {
      if (waking) {
        event.preventDefault();
        event.stopPropagation();
        waking = false;
      }
    };
    const visibility = () => {
      setShown(false);
      arm();
    };
    document.addEventListener("keydown", key, true);
    document.addEventListener("keyup", keyup, true);
    document.addEventListener("visibilitychange", visibility);
    arm();
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", key, true);
      document.removeEventListener("keyup", keyup, true);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [env, minutes]);

  useEffect(() => {
    if (!shown || images.length < 2) {
      return undefined;
    }
    const timer = window.setInterval(() => setSlide((index) => index + 1), SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [shown, images.length]);

  if (!shown) {
    return null;
  }
  const image = images.length ? images[slide % images.length] : null;
  return (
    <div class={styles.screensaver} data-screensaver aria-hidden="true">
      {image ? (
        <div
          key={slide}
          class={styles.picture}
          data-drift={slide % 2 ? "left" : "right"}
          style={{ backgroundImage: "url(" + JSON.stringify(image) + ")" }}
        />
      ) : null}
    </div>
  );
};
