/**
 * Fills a wide Cinema tile around square app art so the tile reads as one full-bleed image.
 *
 * - "edges": both side edges of the art are one solid colour each, so the tile is painted with
 *   those colours and the art blends in (Netflix on white, Spotify on black).
 * - "blur": the edges are a gradient, a photo or transparent, so a soft blur of the art fills the
 *   sides. Art with transparent corners (round or rounded icons) is also drawn a little smaller.
 *
 * Reading pixels can fail on a tainted canvas; that falls back to the blur, which never reads.
 */
export type ArtFill =
  Readonly<{ kind: "edges"; left: string; right: string }> | Readonly<{ kind: "blur"; inset: boolean }>;

const SAMPLE_HEIGHT = 48;
/** Largest summed RGB distance from the column average that still counts as one colour. */
const SOLID_TOLERANCE = 36;
const OPAQUE = 250;
const BLUR_FALLBACK: ArtFill = { kind: "blur", inset: false };

interface Column {
  colour: string;
  opaque: boolean;
  solid: boolean;
}

const readColumn = (data: Uint8ClampedArray, width: number, height: number, x: number): Column => {
  const pixels: number[][] = [];
  for (let y = 0; y < height; y += 1) {
    const offset = (y * width + x) * 4;
    pixels.push([data[offset], data[offset + 1], data[offset + 2], data[offset + 3]]);
  }
  const average = [0, 1, 2].map((channel) => pixels.reduce((sum, pixel) => sum + pixel[channel], 0) / pixels.length);
  const opaque = pixels.every((pixel) => pixel[3] >= OPAQUE);
  const spread = Math.max(
    ...pixels.map((pixel) => [0, 1, 2].reduce((sum, channel) => sum + Math.abs(pixel[channel] - average[channel]), 0)),
  );
  return {
    colour: "rgb(" + average.map((value) => Math.round(value)).join(",") + ")",
    opaque,
    solid: spread <= SOLID_TOLERANCE,
  };
};

export const readArtFill = (image: HTMLImageElement): ArtFill => {
  const { naturalWidth, naturalHeight } = image;
  if (!naturalWidth || !naturalHeight) {
    return BLUR_FALLBACK;
  }
  const height = SAMPLE_HEIGHT;
  const width = Math.max(2, Math.round((naturalWidth / naturalHeight) * height));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  try {
    const context = canvas.getContext("2d");
    if (!context) {
      return BLUR_FALLBACK;
    }
    context.drawImage(image, 0, 0, width, height);
    const data = context.getImageData(0, 0, width, height).data;
    const left = readColumn(data, width, height, 0);
    const right = readColumn(data, width, height, width - 1);
    if (!left.opaque || !right.opaque) {
      return { kind: "blur", inset: true };
    }
    if (!left.solid || !right.solid) {
      return BLUR_FALLBACK;
    }
    return { kind: "edges", left: left.colour, right: right.colour };
  } catch (_error) {
    // A cross-origin or file image taints the canvas; the blur needs no pixel reads.
    return BLUR_FALLBACK;
  }
};

/** Two flat side colours meeting under the art. */
export const edgeBackground = (fill: ArtFill) =>
  fill.kind === "edges" ? "linear-gradient(90deg," + fill.left + " 50%," + fill.right + " 50%)" : undefined;

const BLUR_FILTER = "blur(10px) saturate(1.25) brightness(0.82)";
/** Overscan hides the transparent rim that a canvas blur leaves at its edges. */
const BLUR_OVERSCAN = 1.3;

/** Paints a soft, slightly dimmed copy of the art across a small canvas the CSS stretches. */
export const paintBlur = (canvas: HTMLCanvasElement, image: HTMLImageElement) => {
  const context = canvas.getContext("2d");
  if (!context || !image.naturalWidth || !image.naturalHeight) {
    return;
  }
  const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight) * BLUR_OVERSCAN;
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.filter = BLUR_FILTER;
  context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  context.filter = "none";
};
