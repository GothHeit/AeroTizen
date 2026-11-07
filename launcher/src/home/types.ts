import type { RefObject } from "preact";

import type { AppPresentation, ContinueItem, HomeBridge, InputSource, InstalledApp } from "../contracts/launcher";
import type { SettingsSnapshot, SettingsStore } from "../contracts/preferences";
import type { StatusStores } from "../contracts/status";
import type { LauncherUpdateNotice } from "../contracts/updates";
import type { LauncherRuntime } from "../platform/tizen/launcherRuntime";
import type { MessageKey } from "../shared/i18n/catalogues";
import type { MutableStore, Store } from "../shared/state/createStore";
export interface Inventory {
  readonly apps: readonly InstalledApp[];
  readonly inputs: readonly InputSource[];
  readonly items: readonly ContinueItem[];
  readonly ready: boolean;
}
export type Page = "home" | "apps";
export interface HomeMenuChoice {
  readonly action: "add" | "remove" | "move";
  readonly label: MessageKey;
}
export interface HomeState {
  readonly active: boolean;
  readonly appOffset: number;
  readonly appsEndOffset: number;
  readonly continueOffset: number;
  readonly draft: readonly string[] | null;
  /** Cinema "Find an app": the typed filter, or null while the grid shows every app. */
  readonly find: string | null;
  readonly menu: Readonly<{ id: string; selected: number }> | null;
  readonly moving: string | null;
  readonly page: Page;
  /** Cinema side panel: the key to restore when it closes, or null while closed. */
  readonly rail: string | null;
  readonly scroll: number;
  readonly selected: string;
  /** True while the find field owns the remote and the TV keyboard is up. */
  readonly typing: boolean;
}
export interface HomeEnvironment {
  activate(key: string): void;
  appItems: RefObject<HTMLDivElement>;
  appViewport: RefObject<HTMLDivElement>;
  bridge: HomeBridge;
  choose(index: number): void;
  columns(settings: SettingsSnapshot): number;
  continueItems: RefObject<HTMLDivElement>;
  continueViewport: RefObject<HTMLDivElement>;
  describe(app: InstalledApp): AppPresentation;
  dismiss(): void;
  /** Cinema "Find an app": follow the typed text, or leave the field (cancel clears it). */
  findText(text: string): void;
  finishFind(cancel: boolean): void;
  inventory: Store<Inventory>;
  menuChoices(): readonly HomeMenuChoice[];
  nodes: Map<string, HTMLElement>;
  rows: RefObject<HTMLElement>;
  runtime: LauncherRuntime;
  select(key: string): void;
  settings: SettingsStore;
  showMoveInstructions(): void;
  showPage(page: Page): void;
  state: MutableStore<HomeState>;
  status: StatusStores;
  updates: LauncherUpdateNotice;
}
