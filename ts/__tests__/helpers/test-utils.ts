import { expect } from "vitest";

export const cleanup = (): void => {
  // Cleanup function
};

export const createTempFile = (name: string): string => {
  return `/tmp/test-${Date.now()}-${name}`;
};

export const randomString = (length: number = 10): string => {
  return Math.random()
    .toString(36)
    .substring(2, length + 2);
};

export const expectThrow = (fn: () => void, errorMessage: string): void => {
  let threw = false;
  try {
    fn();
  } catch (e) {
    threw = true;
    if (e instanceof Error) {
      expect(e.message).toContain(errorMessage);
    }
  }
  expect(threw).toBe(true);
};

export const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
