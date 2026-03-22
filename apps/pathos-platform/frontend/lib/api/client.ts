// Mock API client with simulated latency
// This provides a standardized way to access mock data throughout the app

const DEFAULT_DELAY_MS = 300;

/**
 * Simulates an async GET request with configurable latency.
 * Use this to wrap mock data access for consistent behavior.
 *
 * @param fn - A function that returns the mock data
 * @param delayMs - Optional delay in milliseconds (default: 300ms)
 * @returns A Promise that resolves with the data after the delay
 */
export function mockGet<T>(fn: () => T, delayMs: number = DEFAULT_DELAY_MS): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(fn());
    }, delayMs);
  });
}

/**
 * Simulates an async POST/PUT request with configurable latency.
 * Use this to wrap mock data mutations for consistent behavior.
 *
 * @param fn - A function that performs the mutation and returns the result
 * @param delayMs - Optional delay in milliseconds (default: 300ms)
 * @returns A Promise that resolves with the result after the delay
 */
export function mockPost<T>(fn: () => T, delayMs: number = DEFAULT_DELAY_MS): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(fn());
    }, delayMs);
  });
}

