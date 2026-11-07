declare module "virtual:shelf-images" {
  /** Paths of images in launcher/assets/shelf, relative to index.html. */
  export const custom: readonly string[];
  /** Built-in scenes used while no custom images exist. */
  export const fallback: readonly string[];
}
