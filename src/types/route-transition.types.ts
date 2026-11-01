export interface RouteTransitionState {
  isTransitioning: boolean;
  isPostLoginTransition: boolean;
  isPostLoginWaveComplete: boolean;
  isPostLoginRouteReady: boolean;
}

export interface RouteTransitionContextValue extends RouteTransitionState {
  markPostLoginWaveComplete: () => void;
  markPostLoginRouteReady: () => void;
}
