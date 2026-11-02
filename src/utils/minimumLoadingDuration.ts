export const MINIMUM_LOADING_DURATION_MS = 500;

export function waitForMinimumLoadingDuration(startedAt: number): Promise<void> {
  const remainingDuration = Math.max(
    0,
    MINIMUM_LOADING_DURATION_MS - (performance.now() - startedAt),
  );

  if (remainingDuration === 0) return Promise.resolve();
  return new Promise((resolve) => window.setTimeout(resolve, remainingDuration));
}
