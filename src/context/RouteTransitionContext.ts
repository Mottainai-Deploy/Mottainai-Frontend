import { createContext } from "react";
import type { RouteTransitionContextValue } from "@/types/route-transition.types";

export const RouteTransitionContext = createContext<RouteTransitionContextValue>({
  isTransitioning: false,
  isPostLoginTransition: false,
  isPostLoginWaveComplete: false,
  isPostLoginRouteReady: false,
  markPostLoginWaveComplete: () => undefined,
  markPostLoginRouteReady: () => undefined,
});
