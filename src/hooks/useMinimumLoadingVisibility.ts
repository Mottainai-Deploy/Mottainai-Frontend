import { useEffect, useRef, useState } from "react";
import { MINIMUM_LOADING_DURATION_MS } from "@/utils/minimumLoadingDuration";

export function useMinimumLoadingVisibility(isLoading: boolean): boolean {
  const [visibilityState, setVisibilityState] = useState(() => ({
    previousIsLoading: isLoading,
    isVisible: isLoading,
  }));
  const startedAtRef = useRef<number | null>(null);

  if (isLoading !== visibilityState.previousIsLoading) {
    setVisibilityState({
      previousIsLoading: isLoading,
      isVisible: isLoading || visibilityState.isVisible,
    });
  }

  useEffect(() => {
    if (isLoading) {
      startedAtRef.current = performance.now();
      return undefined;
    }

    if (!visibilityState.isVisible) {
      startedAtRef.current = null;
      return undefined;
    }

    const startedAt = startedAtRef.current ?? performance.now();
    const remainingDuration = Math.max(
      0,
      MINIMUM_LOADING_DURATION_MS - (performance.now() - startedAt),
    );
    const timeoutId = window.setTimeout(() => {
      startedAtRef.current = null;
      setVisibilityState((current) => ({ ...current, isVisible: false }));
    }, remainingDuration);

    return () => window.clearTimeout(timeoutId);
  }, [isLoading, visibilityState.isVisible]);

  return isLoading || visibilityState.isVisible;
}
