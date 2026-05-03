import { expect } from "vitest";
export const cleanup = () => {
    // Cleanup function
};
export const createTempFile = (name) => {
    return `/tmp/test-${Date.now()}-${name}`;
};
export const randomString = (length = 10) => {
    return Math.random()
        .toString(36)
        .substring(2, length + 2);
};
export const expectThrow = (fn, errorMessage) => {
    let threw = false;
    try {
        fn();
    }
    catch (e) {
        threw = true;
        if (e instanceof Error) {
            expect(e.message).toContain(errorMessage);
        }
    }
    expect(threw).toBe(true);
};
export const wait = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};
