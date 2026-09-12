import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { configure } from "@testing-library/react";
import { cleanup } from "@testing-library/react";

configure({ getElementErrorOutput: () => "" });
process.env.DEBUG_PRINT_LIMIT = "0";

class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}

Object.defineProperty(window, "IntersectionObserver", { value: ObserverStub, writable: true });
Object.defineProperty(window, "ResizeObserver", { value: ObserverStub, writable: true });
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  }),
});
window.scrollTo = () => {};
window.URL.createObjectURL = () => "blob:stub";
window.URL.revokeObjectURL = () => {};
window.HTMLCanvasElement.prototype.getContext = (() => null) as unknown as typeof window.HTMLCanvasElement.prototype.getContext;
Object.defineProperty(document, "fonts", { value: { ready: Promise.resolve(), addEventListener: () => {}, removeEventListener: () => {} }, configurable: true });
Object.defineProperty(window, "Notification", {
  configurable: true,
  writable: true,
  value: Object.assign(class { static permission = "default"; static requestPermission = () => Promise.resolve("granted"); }, { permission: "default" }),
});

afterEach(() => { cleanup(); vi.useRealTimers(); });
