import { vi } from "vitest";
import { defineComponent } from "vue";

// Mock @vue/test-utils BEFORE any tests import it
vi.mock("@vue/test-utils", async () => {
  const actual = await vi.importActual("@vue/test-utils");
  const originalMount = (actual as any).mount;

  return {
    ...(actual as any),
    mount(component: any, options: any = {}) {
      // If setup is async, wrap in Suspense
      if (
        component.setup &&
        component.setup.constructor.name === "AsyncFunction"
      ) {
        const wrapped = defineComponent({
          template: `<Suspense><C /></Suspense>`,
          components: { C: component },
        });
        return originalMount(wrapped, options);
      }

      // Mount normally
      return originalMount(component, options);
    },
  };
});

// Suppress console warnings and errors during tests
vi.spyOn(console, "warn").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

// Ensure localStorage is available in tests (jsdom should provide it)
if (typeof localStorage === "undefined") {
  const store: Record<string, string> = {};
  (global as any).localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((key) => {
        delete store[key];
      });
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
}
