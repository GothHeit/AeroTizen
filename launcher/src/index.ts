import { flushSync } from "preact/compat";

import version from "../version.txt?raw";

import { createLauncherApp } from "./app/createLauncherApp";
import { mountToast } from "./app/mountToast";
import type { BackgroundState } from "./backgrounds/createBackgrounds";
import { mountBackgrounds } from "./backgrounds/mountBackgrounds";
import type { ClockService } from "./contracts/launcher";
import type { SettingsService } from "./contracts/preferences";
import type { NetworkService } from "./contracts/status";
import type { WallpaperLibrary } from "./contracts/wallpapers";
import { mountFireplace } from "./fireplace/mountFireplace";
import { mountHome } from "./home/index";
import { createClockPlatform } from "./platform/tizen/createClockPlatform";
import { createNetworkPlatform } from "./platform/tizen/createNetworkPlatform";
import { defaultTemperatureUnit } from "./platform/tizen/defaultTemperatureUnit";
import { createWallpaperScaler } from "./platform/tizen/scaleWallpaper";
import { createClockService } from "./services/createClockService";
import { createLauncherUpdates } from "./services/createLauncherUpdates";
import { createNetworkService } from "./services/createNetworkService";
import { createSettingsService } from "./services/createSettingsService";
import { createWallpaperCache } from "./services/wallpapers/createWallpaperCache";
import { createWallpaperLibrary } from "./services/wallpapers/createWallpaperLibrary";
import { WALLPAPER_SOURCE } from "./services/wallpapers/wallpaperSource";
import { mountSettings } from "./settings/index";

const backgroundHost = document.getElementById("bg");
const home = document.getElementById("home-root");
const settingsHost = document.getElementById("settings-root");
const toastHost = document.getElementById("toast-root");
const weatherPhotoHost = document.getElementById("weather-photo-root");
const fireplaceHost = document.getElementById("fireplace-root");
if (!backgroundHost || !home || !settingsHost || !toastHost || !weatherPhotoHost || !fireplaceHost) {
  throw new Error("Launcher mount points are missing.");
}
const runtime = window.AeroTizen;
const hotData = import.meta.hot
  ? (import.meta.hot.data as {
      backgrounds?: BackgroundState;
      clock?: ClockService;
      network?: NetworkService;
      preferences?: SettingsService;
      wallpapers?: WallpaperLibrary;
    })
  : undefined;
const clock =
  hotData?.clock ||
  createClockService({
    platform: createClockPlatform(window, () => runtime.settings?.getSnapshot().numerals ?? "latn"),
    now: () => Date.now(),
    timers: window,
  });
runtime.clock = clock;
const settings =
  hotData?.preferences ||
  createSettingsService({
    defaults: runtime.config.DEFAULTS,
    storageKey: runtime.config.STORAGE_KEY,
    legacyStorageKeys: runtime.config.LEGACY_STORAGE_KEYS,
    storage: {
      getItem: (key) => localStorage.getItem(key),
      setItem: (key, value) => localStorage.setItem(key, value),
    },
    speedRange: runtime.config.SPEED,
    locale: {
      timeFormat: clock.defaultTimeFormat,
      tempUnit: () =>
        defaultTemperatureUnit(navigator.languages?.length ? navigator.languages : [navigator.language], Intl),
    },
  });
runtime.settings = settings;
if (!hotData?.preferences) {
  settings.load();
}
const network =
  hotData?.network ||
  createNetworkService({
    platform: createNetworkPlatform(window),
    settings,
    timers: window,
  });
runtime.network = network;
const wallpapers =
  hotData?.wallpapers ||
  createWallpaperLibrary({
    source: WALLPAPER_SOURCE,
    cache: createWallpaperCache(window.indexedDB),
    choice: {
      getSnapshot: () => settings.getSnapshot().shelfWallpaper,
      subscribe: (listener) => settings.subscribe(listener),
    },
    fetch: (url, init) => window.fetch(url, init),
    scale: createWallpaperScaler(window),
    urls: { create: (blob) => URL.createObjectURL(blob), revoke: (url) => URL.revokeObjectURL(url) },
    now: () => Date.now(),
    online: () => navigator.onLine !== false,
    timers: window,
  });
runtime.wallpapers = wallpapers;
const weather = window.Weather;
const backgrounds = mountBackgrounds(
  backgroundHost,
  weatherPhotoHost,
  runtime,
  weather,
  hotData && hotData.backgrounds,
);
window.Backgrounds = backgrounds.bridge;
const platform = { backgrounds: backgrounds.bridge, previewBackground: backgrounds.previewBackground, weather };
const toast = mountToast(toastHost);
const fireplace = mountFireplace(fireplaceHost, (key, values) => runtime.translate(key, values));
const previousFireplace = window.Fireplace;
window.Fireplace = fireplace.bridge;
const previousCommands = {
  applyBackground: runtime.applyBackground,
  toast: runtime.toast,
  hideToast: runtime.hideToast,
};
Object.assign(runtime, toast.bridge, { applyBackground: backgrounds.apply });
const dispose = () => {
  Object.assign(runtime, previousCommands);
  window.Fireplace = previousFireplace;
  fireplace.dispose();
  toast.dispose();
  backgrounds.dispose();
};

try {
  const app = createLauncherApp(
    runtime,
    platform,
    { home, settings: settingsHost },
    { home: mountHome, settings: mountSettings },
    createLauncherUpdates(version.trim()),
    settings,
    flushSync,
  );
  if (import.meta.hot && hotData) {
    if (hotData.backgrounds) {
      runtime.applyBackground();
    }
    import.meta.hot.accept();
    import.meta.hot.dispose(() => {
      hotData.backgrounds = backgrounds.getState();
      hotData.clock = clock;
      hotData.preferences = settings;
      hotData.network = network;
      hotData.wallpapers = wallpapers;
      app.dispose();
      dispose();
    });
  }
} catch (error) {
  dispose();
  throw error;
}
