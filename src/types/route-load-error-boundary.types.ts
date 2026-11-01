import type { ReactNode } from "react";

export interface RouteLoadErrorBoundaryProps {
  children: ReactNode;
  onError?: () => void;
}

export interface RouteLoadErrorBoundaryState {
  hasError: boolean;
}
