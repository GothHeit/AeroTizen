/** Picker tiles are 240x135 and lift on focus, so copies are a little larger than the tile. */
const WIDTH = 320;
const HEIGHT = 180;

type ScaleWindow = Pick<Window & typeof globalThis, "createImageBitmap"> & {
  document: Pick<Document, "createElement">;
};

/** Decodes a picture straight to thumbnail size, so a full 1080p bitmap never stays in memory. */
export const createWallpaperScaler =
  (browser: ScaleWindow) =>
  async (picture: Blob): Promise<Blob> => {
    const bitmap = await browser.createImageBitmap(picture, {
      // Width only keeps the picture's shape; anything that is not 16:9 is cropped to the middle below.
      resizeWidth: WIDTH,
      resizeQuality: "medium",
    });
    try {
      const canvas = browser.document.createElement("canvas");
      canvas.width = WIDTH;
      canvas.height = HEIGHT;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Canvas is unavailable.");
      }
      const scale = Math.max(WIDTH / bitmap.width, HEIGHT / bitmap.height);
      const width = bitmap.width * scale;
      const height = bitmap.height * scale;
      context.drawImage(bitmap, (WIDTH - width) / 2, (HEIGHT - height) / 2, width, height);
      return await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Thumbnail failed."))), "image/jpeg", 0.82),
      );
    } finally {
      bitmap.close();
    }
  };
