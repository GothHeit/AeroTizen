import { useEffect, useRef } from "preact/hooks";

import styles from "./SoftBackdrop.module.css";

// A 48×27 canvas stretched to full screen: the browser's bitmap upscale gives a soft,
// blur-like backdrop for one tiny draw, instead of a full-screen blur filter.
const WIDTH = 48;
const HEIGHT = 27;

export const SoftBackdrop = ({ image, shown }: { image: string | null; shown: boolean }) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context || !image) {
      return undefined;
    }
    let current = true;
    const source = new Image();
    source.onload = () => {
      if (current) {
        context.drawImage(source, 0, 0, WIDTH, HEIGHT);
      }
    };
    source.src = image;
    return () => {
      current = false;
      source.onload = null;
    };
  }, [image]);
  return (
    <div class={styles.backdrop} data-shown={shown ? "true" : "false"} aria-hidden="true">
      <canvas ref={canvas} class={styles.canvas} width={WIDTH} height={HEIGHT} />
    </div>
  );
};
