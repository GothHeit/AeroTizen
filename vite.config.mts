/// <reference types="vitest/config" />

import preact from "@preact/preset-vite";
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { defineConfig } from "vite";

const root = fileURLToPath(new URL("./", import.meta.url));
const source = path.join(root, "launcher");

// Copy the explicit production page and runtime assets; source views are bundled separately.
const widgetAssets = (output: string): Plugin => ({
  name: "aerotizen-widget-assets",
  apply: "build",
  async buildStart() {
    await rm(output, { recursive: true, force: true });
    await cp(source, output, {
      recursive: true,
      // Top Shelf pictures load from GitHub at runtime, so a local wallpapers folder never ships.
      filter: (file) => file !== path.join(source, "src") && file !== path.join(source, "assets", "wallpapers"),
    });
    await mkdir(path.join(output, "licenses"), { recursive: true });
    await cp(path.join(root, "node_modules/preact/LICENSE"), path.join(output, "licenses/preact.txt"));
    await cp(path.join(root, "node_modules/i18next/LICENSE"), path.join(output, "licenses/i18next.txt"));
    // Includes Lucide's ISC terms and the inherited Feather MIT notice.
    await cp(path.join(root, "node_modules/lucide-preact/LICENSE"), path.join(output, "licenses/lucide-preact.txt"));
  },
});

// Lists Top Shelf images at build time. Drop JPEG/PNG/WebP files into launcher/assets/shelf;
// the weather scenes are used until any exist. Images ship as files, never inlined.
const SHELF_MODULE = "virtual:shelf-images";
const shelfImages: Plugin = {
  name: "aerotizen-shelf-images",
  resolveId: (id) => (id === SHELF_MODULE ? "\0" + SHELF_MODULE : undefined),
  async load(id) {
    if (id !== "\0" + SHELF_MODULE) {
      return undefined;
    }
    const list = async (folder: string) => {
      const names = await readdir(path.join(source, "assets", folder)).catch(() => [] as string[]);
      return names
        .filter((name) => /\.(jpe?g|png|webp)$/i.test(name))
        .sort()
        .map((name) => "assets/" + folder + "/" + name);
    };
    return (
      "export const custom = " +
      JSON.stringify(await list("shelf")) +
      ";\n" +
      "export const fallback = " +
      JSON.stringify(await list("weather")) +
      ";\n"
    );
  },
};

const developmentEntry: Plugin = {
  name: "aerotizen-development-entry",
  apply: "serve",
  transformIndexHtml: {
    order: "pre",
    handler(html) {
      return html
        .replace('    <link rel="stylesheet" href="js/launcher-ui.css" />\n', "")
        .replace('<script src="js/launcher-ui.js"></script>', "")
        .replace('<script src="js/main.js"></script>', '<script type="module" src="/src/dev.ts"></script>');
    },
  },
};

export default defineConfig(({ mode }) => {
  const output = path.join(root, "dist", mode === "tv-dev" ? "launcher-dev" : "launcher");
  return {
    root: source,
    base: "./",
    publicDir: false,
    css: {
      transformer: "lightningcss",
      // Lightning CSS encodes major.minor.patch in three bytes, including in development.
      lightningcss: { targets: { chrome: 69 << 16 } },
    },
    plugins: [preact({ devToolsEnabled: false }), widgetAssets(output), developmentEntry, shelfImages],
    server: { host: "0.0.0.0", port: 8019, strictPort: true },
    test: {
      include: ["src/**/*.test.{ts,tsx}"],
      environment: "jsdom",
      setupFiles: ["src/test/setup.ts"],
    },
    build: {
      target: ["chrome69", "es2018"],
      cssTarget: "chrome69",
      outDir: path.join(output, "js"),
      emptyOutDir: false,
      minify: true,
      lib: {
        entry: path.join(source, "src/index.ts"),
        name: "AeroTizenLauncher",
        formats: ["iife"],
        fileName: () => "launcher-ui.js",
        cssFileName: "launcher-ui",
      },
    },
  };
});
