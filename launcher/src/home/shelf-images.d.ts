declare module "virtual:shelf-images" {
  /** Paths of images in launcher/assets/shelf, relative to index.html. */
  export const custom: readonly string[];
  /** Built-in scenes used while no custom images exist. */
  export const fallback: readonly string[];
  /** Pictures from launcher/assets/wallpapers that can be pinned to the shelf in Settings. */
  export const wallpapers: readonly string[];
}
