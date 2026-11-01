import { waitForMinimumLoadingDuration } from "@/utils/minimumLoadingDuration";

export async function loadModuleWithMinimumDuration<T>(
  loadModule: () => Promise<T>,
): Promise<T> {
  const startedAt = performance.now();

  try {
    const module = await loadModule();
    await waitForMinimumLoadingDuration(startedAt);
    return module;
  } catch (error: unknown) {
    await waitForMinimumLoadingDuration(startedAt);
    throw error;
  }
}
