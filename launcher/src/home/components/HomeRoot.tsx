import { useStore } from "../../shared/hooks/useStore";
import type { HomeEnvironment } from "../types";

import { CinemaHome } from "./CinemaHome/CinemaHome";
import { Home } from "./Home/Home";

/** Picks the Home layout; both share one controller and its remote handling. */
export const HomeRoot = ({ env }: { env: HomeEnvironment }) =>
  useStore(env.settings).cinemaUi ? <CinemaHome env={env} /> : <Home env={env} />;
