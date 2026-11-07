import { useEffect, useRef } from "preact/hooks";

import styles from "./SoftBackdrop.module.css";

// A 384×216 canvas blurred once per picture and stretched 5× by CSS. The blur is baked into
// the bitmap, so the screen never runs a live filter, and the mild upscale stays smooth.
// (A tiny 48×27 canvas looked blocky on the TV: a 40× bilinear stretch shows its grid.)
const WIDTH = 384;
const HEIGHT = 216;
const BLUR = 9;
// Draw past the edges so the blur doesn't pull black in from outside the picture.
const BLEED = BLUR * 3;

const paint = (target: HTMLCanvasElement, source: HTMLImageElement) => {
  const context = target.getContext("2d");
  if (!context) {
    return;
  }
  context.clearRect(0, 0, WIDTH, HEIGHT);
  if (typeof (context as { filter?: unknown }).filter === "string") {
    context.filter = "blur(" + BLUR + "px)";
    context.drawImage(source, -BLEED, -BLEED, WIDTH + BLEED * 2, HEIGHT + BLEED * 2);
    context.filter = "none";
    return;
  }
  // Older engines: shrink in steps and grow back, which softens without a filter.
  context.imageSmoothingEnabled = true;
  context.drawImage(source, 0, 0, WIDTH / 8, HEIGHT / 8);
  context.drawImage(target, 0, 0, WIDTH / 8, HEIGHT / 8, 0, 0, WIDTH, HEIGHT);
};

export const SoftBackdrop = ({ image, shown }: { image: string | null; shown: boolean }) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const target = canvas.current;
    if (!target || !image) {
      return undefined;
    }
    let current = true;
    const source = new Image();
    source.onload = () => {
      if (current) {
        paint(target, source);
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
