import { fireEvent, render, screen } from "@testing-library/preact";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { createCardEnvironment } from "../../test/createCardEnvironment";

import { CinemaAppTile } from "./CinemaAppTile";

const app = { id: "demo", name: "Demo app", icon: "/icon.png" };
const artwork = (card: HTMLElement) => card.querySelector<HTMLImageElement>("[data-app-artwork]");
const fallback = (card: HTMLElement) => card.querySelector<HTMLElement>("[data-app-fallback]");
const name = (container: Element) => container.querySelector("[data-cinema-tile-name]");

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test("an unknown app's own icon becomes the tile art and its name moves under the focused tile", () => {
  const env = createCardEnvironment(`app:${app.id}`);
  const { container } = render(<CinemaAppTile env={env} app={app} active />);
  const card = screen.getByRole("button", { name: app.name });

  expect(artwork(card)?.getAttribute("src")).toBe(app.icon);
  expect(fallback(card)?.querySelector("img")).toBeNull();
  expect(name(container)).toBeNull();

  fireEvent.load(artwork(card)!);

  expect(artwork(card)?.hidden).toBe(false);
  expect(fallback(card)?.hidden).toBe(true);
  expect(name(container)?.textContent).toBe(app.name);
  expect(vi.getTimerCount()).toBe(0);
});

test("store art is tried before the icon, and the name stays hidden without focus", () => {
  const env = createCardEnvironment("", { artwork: ["/store.png"] });
  const { container } = render(<CinemaAppTile env={env} app={app} active />);
  const card = screen.getByRole("button", { name: app.name });

  fireEvent.error(artwork(card)!);
  expect(artwork(card)?.getAttribute("src")).toBe(app.icon);
  fireEvent.load(artwork(card)!);

  expect(artwork(card)?.hidden).toBe(false);
  expect(name(container)).toBeNull();
});

test("keeps the in-tile label when no art loads", () => {
  const env = createCardEnvironment(`app:${app.id}`, { useAppIcon: false });
  const { container } = render(<CinemaAppTile env={env} app={app} active />);
  const card = screen.getByRole("button", { name: app.name });

  expect(artwork(card)).toBeNull();
  expect(fallback(card)?.hidden).toBe(false);
  expect(fallback(card)?.textContent).toBe(app.name);
  expect(name(container)).toBeNull();
});
